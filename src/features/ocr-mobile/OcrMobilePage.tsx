import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { AlertDialog } from "@om/ui/alert-dialog";
import { Button } from "@om/ui/button";
import { IconButton } from "@om/ui/icon-button";
import {
  Camera,
  CheckCircle2,
  Crop,
  QrCode,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import {
  canRetryOcrJob,
  canSeedOcrJob,
  fetchChurchOcrJobs,
  mapOcrJobToWizardStatus,
  retryChurchOcrJob,
  seedChurchOcrJob,
  type OcrJobDto,
} from "../ocr-desktop/ocrApi";

type Phase = 1 | 2 | 3 | 4;
type StepStatus = "done" | "active" | "pending";
type UploadStatus = "local" | "uploading" | "uploaded" | "failed";
type QualityWarning = "blurry" | "glare" | "cropped" | "duplicate" | null;

type Step = {
  readonly shortLabel: string;
  readonly status: StepStatus;
  readonly detail?: string;
};

type PageItem = {
  readonly n: number;
  readonly bg: string;
  upload: UploadStatus;
  quality: QualityWarning;
};

const ALL_STEPS: Record<Phase, Step[]> = {
  1: [
    { shortLabel: "Connect", status: "active" },
    { shortLabel: "Capture", status: "pending" },
    { shortLabel: "Review", status: "pending" },
    { shortLabel: "OCR", status: "pending" },
  ],
  2: [
    { shortLabel: "Connect", status: "done" },
    { shortLabel: "Capture", status: "active", detail: "12 pages" },
    { shortLabel: "Review", status: "pending" },
    { shortLabel: "OCR", status: "pending" },
  ],
  3: [
    { shortLabel: "Connect", status: "done" },
    { shortLabel: "Capture", status: "done" },
    { shortLabel: "Review", status: "active" },
    { shortLabel: "OCR", status: "pending" },
  ],
  4: [
    { shortLabel: "Connect", status: "done" },
    { shortLabel: "Capture", status: "done" },
    { shortLabel: "Review", status: "done" },
    { shortLabel: "OCR", status: "active" },
  ],
};

const PROGRESS: Record<Phase, number> = { 1: 12, 2: 37, 3: 62, 4: 88 };

const THUMB_BG = [
  "#F5F0E8",
  "#EEF0F5",
  "#F0F5EE",
  "#F5EEF0",
  "#EDF3F0",
  "#F3EDF5",
  "#F5F1E8",
  "#EBF0F5",
  "#F0F5EB",
  "#F5EBF0",
  "#E8F3F0",
  "#F0E8F3",
] as const;

function thumbBg(index: number): string {
  return THUMB_BG[index % THUMB_BG.length] ?? "#F5F0E8";
}

const INITIAL_PAGES: PageItem[] = Array.from({ length: 12 }, (_, i) => {
  const qualities: QualityWarning[] = [
    null,
    "blurry",
    null,
    null,
    "glare",
    null,
    null,
    "cropped",
    null,
    null,
    null,
    "duplicate",
  ];
  const uploads: UploadStatus[] = [
    "uploaded",
    "uploaded",
    "uploading",
    "failed",
    "uploaded",
    "local",
    "uploaded",
    "local",
    "uploaded",
    "uploaded",
    "uploading",
    "uploaded",
  ];
  return {
    n: i + 1,
    bg: thumbBg(i),
    upload: uploads[i] ?? "local",
    quality: qualities[i] ?? null,
  };
});

const MOCK_OCR_STEPS = [
  { label: "Upload complete", done: true },
  { label: "Creating OCR jobs", done: true },
  { label: "OCR processing", done: false },
  { label: "Ready for Review", done: false },
] as const;

const WIZARD_STATUS_LABEL: Record<
  ReturnType<typeof mapOcrJobToWizardStatus>,
  string
> = {
  processing: "Processing",
  "ready-for-review": "Ready for review",
  completed: "Completed",
  failed: "Failed",
};

function PhaseRail({ phase }: { phase: Phase }) {
  const steps = ALL_STEPS[phase];
  return (
    <Stack gap={6} mb="md" aria-label={`Workflow phase ${String(phase)} of 4`}>
      <Group gap="xs" justify="space-between" wrap="nowrap">
        {steps.map((step) => (
          <Text
            key={step.shortLabel}
            size="xs"
            fw={step.status === "active" ? 600 : 400}
            c={
              step.status === "done"
                ? "teal"
                : step.status === "active"
                  ? "gold"
                  : "dimmed"
            }
            style={{ flex: 1, textAlign: "center" }}
          >
            {step.shortLabel}
            {step.detail ? ` · ${step.detail}` : ""}
          </Text>
        ))}
      </Group>
      <Progress value={PROGRESS[phase]} size="sm" color="navy" radius="xl" />
    </Stack>
  );
}

type ConnectMode = "scan" | "permission" | "code" | "success";

/**
 * Productized OM OCR Mobile blueprint (Mantine + @om/ui).
 * Source UX: /blueprints/om-ocr-mobile — Connect → Capture → Review → OCR
 * Live retry/seed reuses church-scoped helpers from `ocr-desktop/ocrApi`.
 */
export function OcrMobilePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>(1);
  const [connectMode, setConnectMode] = useState<ConnectMode>("scan");
  const [pages, setPages] = useState<PageItem[]>(() =>
    INITIAL_PAGES.map((p) => ({ ...p })),
  );
  const [selected, setSelected] = useState(1);
  const [jobs, setJobs] = useState<readonly OcrJobDto[]>([]);
  const [jobsSource, setJobsSource] = useState<"mock" | "live">("mock");
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingSeedId, setPendingSeedId] = useState<string | null>(null);

  const churchId = user?.churchId;
  const liveEligible =
    authMode === "live" && churchId != null && churchId > 0;
  const liveJobs = jobsSource === "live" && liveEligible;

  const warningCount = useMemo(
    () => pages.filter((p) => p.quality !== null).length,
    [pages],
  );
  const failedUploadCount = useMemo(
    () => pages.filter((p) => p.upload === "failed").length,
    [pages],
  );
  const pendingSeed = jobs.find((j) => j.id === pendingSeedId) ?? null;

  const reloadLiveJobs = useCallback((id: number) => {
    setJobsLoading(true);
    setJobsError(null);
    return fetchChurchOcrJobs(id, 20).then((result) => {
      setJobsLoading(false);
      if (!result.ok) {
        setJobsError(result.message);
        setJobsSource("mock");
        setJobs([]);
        return;
      }
      setJobsSource("live");
      setJobs(result.jobs);
    });
  }, []);

  useEffect(() => {
    if (phase !== 4 || authMode !== "live" || churchId == null || churchId <= 0) {
      return;
    }
    const scopedChurchId = churchId;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external OCR jobs fetch on OCR phase
    setJobsLoading(true);
    setJobsError(null);
    void fetchChurchOcrJobs(scopedChurchId, 20).then((result) => {
      if (cancelled) return;
      setJobsLoading(false);
      if (!result.ok) {
        setJobsError(result.message);
        setJobsSource("mock");
        setJobs([]);
        return;
      }
      setJobsSource("live");
      setJobs(result.jobs);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, churchId]);

  function goCapture() {
    setPhase(2);
    setConnectMode("success");
  }

  function addMockPage() {
    setPages((prev) => [
      ...prev,
      {
        n: prev.length + 1,
        bg: thumbBg(prev.length),
        upload: "local",
        quality: null,
      },
    ]);
  }

  function retryFailedPageUploads() {
    setPages((prev) =>
      prev.map((p) =>
        p.upload === "failed" ? { ...p, upload: "uploading" as const } : p,
      ),
    );
    window.setTimeout(() => {
      setPages((prev) =>
        prev.map((p) =>
          p.upload === "uploading" ? { ...p, upload: "uploaded" as const } : p,
        ),
      );
    }, 700);
  }

  const runRetry = (job: OcrJobDto) => {
    if (!churchId) return;
    setActionPendingId(job.id);
    setActionMessage(null);
    void retryChurchOcrJob(churchId, job.id).then((result) => {
      setActionPendingId(null);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(
        `Retry queued for “${job.original_filename ?? job.filename}”.`,
      );
      void reloadLiveJobs(churchId);
    });
  };

  const runSeed = (job: OcrJobDto) => {
    if (!churchId) return;
    setActionPendingId(job.id);
    setActionMessage(null);
    void seedChurchOcrJob(churchId, job.id).then((result) => {
      setActionPendingId(null);
      setPendingSeedId(null);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(
        `Seeded “${job.original_filename ?? job.filename}” into records.`,
      );
      void reloadLiveJobs(churchId);
    });
  };

  return (
    <PageLayout
      title="OCR Mobile"
      description="Mobile capture workflow for sacramental registry pages (blueprint productization)."
    >
      <Box maw={480} mx="auto">
        <PhaseRail phase={phase} />

        {phase === 1 && (
          <Card padding="lg">
            <Stack gap="md">
              <Group gap="sm">
                <QrCode size={22} aria-hidden />
                <Title order={3} style={{ fontWeight: 500 }}>
                  Connect this device
                </Title>
              </Group>
              <Text size="sm" c="dimmed">
                Scan the parish QR code or enter a one-time session code to attach uploads to the
                desktop batch.
              </Text>

              {connectMode === "scan" && (
                <Box
                  h={180}
                  style={{
                    borderRadius: 8,
                    border: "1px dashed var(--mantine-color-default-border)",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--mantine-color-default-hover)",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    Camera preview placeholder
                  </Text>
                </Box>
              )}

              {connectMode === "permission" && (
                <Text size="sm" c="orange">
                  Camera permission is required to scan the parish QR code.
                </Text>
              )}

              {connectMode === "code" && (
                <Text size="sm">
                  Enter session code <Text span fw={600}>OM-7F2K</Text> shown on the desktop OCR
                  console.
                </Text>
              )}

              {connectMode === "success" && (
                <Group gap="xs">
                  <CheckCircle2 size={18} color="var(--mantine-color-teal-6)" aria-hidden />
                  <Text size="sm" fw={500}>
                    Device connected
                  </Text>
                </Group>
              )}

              <Group gap="sm">
                <Button
                  className="om-btn-ghost"
                  variant="secondary"
                  size="sm"
                  onAction={() => setConnectMode("permission")}
                >
                  Request camera
                </Button>
                <Button
                  className="om-btn-ghost"
                  variant="secondary"
                  size="sm"
                  onAction={() => setConnectMode("code")}
                >
                  Enter code
                </Button>
                <Button className="om-btn-primary" size="sm" onAction={goCapture}>
                  Continue
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {phase === 2 && (
          <Card padding="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Capture pages
                </Title>
                <Badge color="navy" variant="light">
                  {pages.length} pages
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Photograph registry pages. Quality warnings flag blur, glare, crop, and duplicates.
              </Text>
              {failedUploadCount > 0 ? (
                <Text size="sm" c="orange" role="status">
                  {`${String(failedUploadCount)} page upload(s) failed. Retry before review, or continue and use OCR-phase job Retry when live.`}
                </Text>
              ) : null}
              <SimpleGrid cols={3} spacing="xs">
                {pages.map((page) => (
                  <Box
                    key={page.n}
                    h={72}
                    p={4}
                    style={{
                      background: page.bg,
                      borderRadius: 6,
                      border:
                        selected === page.n
                          ? "2px solid var(--mantine-color-gold-5)"
                          : "1px solid var(--mantine-color-default-border)",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelected(page.n)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Page ${String(page.n)}${page.quality ? `, warning ${page.quality}` : ""}${page.upload === "failed" ? ", upload failed" : ""}`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(page.n);
                      }
                    }}
                  >
                    <Text size="xs" fw={600}>
                      {page.n}
                    </Text>
                    {page.upload === "failed" ? (
                      <Badge size="xs" color="red" mt={4}>
                        failed
                      </Badge>
                    ) : page.quality ? (
                      <Badge size="xs" color="orange" mt={4}>
                        {page.quality}
                      </Badge>
                    ) : null}
                  </Box>
                ))}
              </SimpleGrid>
              <Group gap="sm">
                <Button className="om-btn-ghost" variant="secondary" size="sm" onAction={addMockPage}>
                  <Camera size={14} aria-hidden />
                  Capture
                </Button>
                {failedUploadCount > 0 ? (
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    onAction={retryFailedPageUploads}
                  >
                    Retry failed uploads
                  </Button>
                ) : null}
                <Button
                  className="om-btn-primary"
                  size="sm"
                  onAction={() => setPhase(3)}
                >
                  Review ({warningCount} warnings)
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {phase === 3 && (
          <Card padding="lg">
            <Stack gap="md">
              <Title order={3} style={{ fontWeight: 500 }}>
                Review before submit
              </Title>
              <Text size="sm" c="dimmed">
                Fix or remove pages with warnings. Selected page: {selected}.
              </Text>
              {failedUploadCount > 0 ? (
                <Text size="sm" c="orange" role="status">
                  {`${String(failedUploadCount)} page(s) still marked failed — submit when ready; live OCR phase can Retry job failures.`}
                </Text>
              ) : null}
              <Group gap="xs">
                <IconButton
                  className="om-header-icon-btn"
                  variant="quiet"
                  accessibleLabel="Rotate page"
                  icon={<RotateCw size={16} aria-hidden />}
                  onAction={() => undefined}
                />
                <IconButton
                  className="om-header-icon-btn"
                  variant="quiet"
                  accessibleLabel="Crop page"
                  icon={<Crop size={16} aria-hidden />}
                  onAction={() => undefined}
                />
                <IconButton
                  className="om-header-icon-btn"
                  variant="quiet"
                  accessibleLabel="Remove page"
                  icon={<X size={16} aria-hidden />}
                  onAction={() =>
                    setPages((prev) => prev.filter((p) => p.n !== selected))
                  }
                />
              </Group>
              <Button className="om-btn-primary" size="sm" onAction={() => setPhase(4)}>
                <Upload size={14} aria-hidden />
                Submit for OCR
              </Button>
            </Stack>
          </Card>
        )}

        {phase === 4 && (
          <Card padding="lg">
            <Stack gap="md">
              <Title order={3} style={{ fontWeight: 500 }}>
                OCR processing
              </Title>

              {liveJobs ? (
                <>
                  <Text size="sm" c="dimmed">
                    {jobsLoading
                      ? "Loading OCR jobs…"
                      : "Live church OCR jobs — Retry failed jobs or Seed when ready_to_seed."}
                    {jobsError ? ` · ${jobsError}` : ""}
                  </Text>
                  {actionMessage ? (
                    <Text size="sm" role="status">
                      {actionMessage}
                    </Text>
                  ) : null}
                  {jobs.length === 0 && !jobsLoading ? (
                    <Text size="sm" c="dimmed">
                      No OCR jobs yet for this church. Capture and upload from desktop or mobile
                      first.
                    </Text>
                  ) : (
                    <Stack gap="sm" role="list" aria-label="OCR jobs">
                      {jobs.map((job) => {
                        const wizard = mapOcrJobToWizardStatus(job);
                        const pending = actionPendingId === job.id;
                        const retryEligible = canRetryOcrJob(job);
                        const seedEligible = canSeedOcrJob(job);
                        return (
                          <Box
                            key={job.id}
                            role="listitem"
                            p="sm"
                            style={{
                              borderRadius: 8,
                              border: "1px solid var(--mantine-color-default-border)",
                            }}
                          >
                            <Stack gap={6}>
                              <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Text size="sm" fw={500} lineClamp={2}>
                                  {job.original_filename ?? job.filename}
                                </Text>
                                <Badge
                                  variant="light"
                                  color={wizard === "failed" ? "red" : "navy"}
                                >
                                  {WIZARD_STATUS_LABEL[wizard]}
                                </Badge>
                              </Group>
                              {job.error_message ? (
                                <Text size="xs" c="orange">
                                  {job.error_message}
                                </Text>
                              ) : null}
                              {retryEligible || seedEligible ? (
                                <Group gap="xs">
                                  {retryEligible ? (
                                    <Button
                                      className="om-btn-ghost"
                                      variant="secondary"
                                      size="sm"
                                      isDisabled={pending}
                                      onAction={() => runRetry(job)}
                                    >
                                      {pending ? "…" : "Retry"}
                                    </Button>
                                  ) : null}
                                  {seedEligible ? (
                                    <Button
                                      className="om-btn-ghost"
                                      variant="secondary"
                                      size="sm"
                                      isDisabled={pending}
                                      onAction={() => setPendingSeedId(job.id)}
                                    >
                                      Seed
                                    </Button>
                                  ) : null}
                                </Group>
                              ) : null}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    isDisabled={jobsLoading || !churchId}
                    onAction={() => {
                      if (churchId) void reloadLiveJobs(churchId);
                    }}
                  >
                    Refresh jobs
                  </Button>
                </>
              ) : (
                <>
                  <Stack gap="xs">
                    {MOCK_OCR_STEPS.map((item) => (
                      <Group key={item.label} gap="sm">
                        <CheckCircle2
                          size={16}
                          color={
                            item.done
                              ? "var(--mantine-color-teal-6)"
                              : "var(--mantine-color-dimmed)"
                          }
                          aria-hidden
                        />
                        <Text size="sm" {...(item.done ? {} : { c: "dimmed" as const })}>
                          {item.label}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                  <Text size="sm" c="dimmed">
                    {jobsError
                      ? `Could not load live jobs (${jobsError}). Showing preview checklist.`
                      : "Preview checklist — set VITE_PORTAL_AUTH_MODE=live with church context for job Retry/Seed."}
                  </Text>
                </>
              )}

              <Button
                className="om-btn-ghost"
                variant="secondary"
                size="sm"
                onAction={() => {
                  setPhase(1);
                  setActionMessage(null);
                  setPendingSeedId(null);
                }}
              >
                Start another session
              </Button>
            </Stack>
          </Card>
        )}

        <AlertDialog
          title="Seed to records?"
          description={
            pendingSeed
              ? `Seed “${pendingSeed.original_filename ?? pendingSeed.filename}” into the church record tables? This writes live sacramental data.`
              : "Seed this OCR job into records?"
          }
          confirmLabel="Seed to records"
          cancelLabel="Cancel"
          intent="confirmation"
          isConfirmPending={
            pendingSeedId !== null && actionPendingId === pendingSeedId
          }
          isOpen={pendingSeedId !== null}
          onOpenChange={(open) => {
            if (!open && actionPendingId === null) setPendingSeedId(null);
          }}
          onConfirm={() => {
            if (pendingSeed) runSeed(pendingSeed);
          }}
          onCancel={() => {
            if (actionPendingId === null) setPendingSeedId(null);
          }}
        />
      </Box>
    </PageLayout>
  );
}
