import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  Select as MantineSelect,
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
  Download,
  FolderOpen,
  QrCode,
  RefreshCw,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import {
  canDownloadOcrJob,
  canRetryOcrJob,
  canSeedOcrJob,
  downloadOcrJobResults,
  mapOcrJobToWizardStatus,
  OCR_LIVE_CUTOFF_NOTES,
  retryChurchOcrJob,
  seedChurchOcrJob,
  uploadOcrJobPages,
  type OcrJobDto,
} from "../ocr-desktop/ocrApi";
import { useOcrJobsPolling } from "../ocr-desktop/useOcrJobsPolling";
import {
  buildMockDemoPages,
  createCapturePagesFromFiles,
  markPagesFailed,
  markPagesUploaded,
  revokeCapturePreviewUrls,
  thumbBg,
  type CapturePageItem,
} from "./ocrMobileCapture";

type Phase = 1 | 2 | 3 | 4;
type StepStatus = "done" | "active" | "pending";

type Step = {
  readonly shortLabel: string;
  readonly status: StepStatus;
  readonly detail?: string;
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
    { shortLabel: "Capture", status: "active", detail: "pages" },
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

const RECORD_TYPES = ["Baptism", "Marriage", "Funeral", "Chrismation"] as const;

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

function PhaseRail({ phase, pageCount }: { phase: Phase; pageCount: number }) {
  const steps = ALL_STEPS[phase].map((step) =>
    step.shortLabel === "Capture" && phase === 2
      ? { ...step, detail: `${String(pageCount)} pages` }
      : step,
  );
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
 * Capture uses camera/file inputs; live mode POSTs via `uploadOcrJobPages`.
 * Live retry/seed reuses church-scoped helpers from `ocr-desktop/ocrApi`.
 */
export function OcrMobilePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>(1);
  const [connectMode, setConnectMode] = useState<ConnectMode>("scan");
  const [pages, setPages] = useState<CapturePageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<string | null>("Baptism");
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null);
  const [pendingSeedId, setPendingSeedId] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagesRef = useRef<CapturePageItem[]>([]);

  const churchId = user?.churchId;
  const liveEligible =
    authMode === "live" && churchId != null && churchId > 0;
  const jobsPoll = useOcrJobsPolling({
    churchId,
    enabled: liveEligible && phase === 4,
    limit: 20,
  });
  const liveJobs = liveEligible && jobsPoll.source === "live";
  const jobs = jobsPoll.jobs;
  const jobsLoading = jobsPoll.loading;
  const jobsError = jobsPoll.error;

  const warningCount = useMemo(
    () => pages.filter((p) => p.quality !== null).length,
    [pages],
  );
  const failedUploadCount = useMemo(
    () => pages.filter((p) => p.upload === "failed").length,
    [pages],
  );
  const selected =
    pages.find((p) => p.id === selectedId) ?? pages[0] ?? null;
  const pendingSeed = jobs.find((j) => j.id === pendingSeedId) ?? null;

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    return () => {
      revokeCapturePreviewUrls(pagesRef.current);
    };
  }, []);

  function goCapture() {
    revokeCapturePreviewUrls(pages);
    if (liveEligible) {
      setPages([]);
      setSelectedId(null);
      setCaptureMessage(
        "Capture with the camera or choose image files — uploads go to the church OCR queue.",
      );
    } else {
      const demo = buildMockDemoPages();
      setPages(demo);
      setSelectedId(demo[0]?.id ?? null);
      setCaptureMessage(
        "Preview capture — set VITE_PORTAL_AUTH_MODE=live with church context for real camera/file uploads.",
      );
    }
    setPhase(2);
    setConnectMode("success");
  }

  async function requestConnectCamera() {
    const mediaDevices =
      typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
      setConnectMode("permission");
      return;
    }
    try {
      const stream = await mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      stream.getTracks().forEach((track) => track.stop());
      setConnectMode("success");
    } catch {
      setConnectMode("permission");
    }
  }

  function addMockPage() {
    setPages((prev) => {
      const next: CapturePageItem = {
        id: `mock-add-${String(prev.length + 1)}-${String(Date.now())}`,
        n: prev.length + 1,
        bg: thumbBg(prev.length),
        upload: "local",
        quality: null,
        filename: `sample-page-${String(prev.length + 1)}.jpg`,
      };
      setSelectedId(next.id);
      return [...prev, next];
    });
  }

  async function ingestFiles(fileList: FileList | readonly File[]) {
    const files = Array.from(fileList).filter((f) => f.size > 0);
    if (!files.length) return;

    const startIndex = pages.length;
    const pendingUpload = liveEligible ? "uploading" : "local";
    const created = createCapturePagesFromFiles(files, startIndex, pendingUpload);

    setPages((prev) => {
      const renumbered = [...prev, ...created].map((p, i) => ({
        ...p,
        n: i + 1,
        bg: thumbBg(i),
      }));
      return renumbered;
    });
    setSelectedId(created[created.length - 1]?.id ?? null);
    setCaptureMessage(null);

    if (!liveEligible || !churchId) {
      window.setTimeout(() => {
        setPages((prev) =>
          prev.map((p) =>
            created.some((c) => c.id === p.id)
              ? { ...p, upload: "uploaded" as const }
              : p,
          ),
        );
        setCaptureMessage(
          `Added ${String(files.length)} page(s) locally (mock — not sent to OCR API).`,
        );
      }, 400);
      return;
    }

    setUploadPending(true);
    const result = await uploadOcrJobPages({
      churchId,
      files,
      recordType: recordType ?? "Baptism",
    });
    setUploadPending(false);

    const ids = created.map((c) => c.id);
    if (!result.ok) {
      setPages((prev) => markPagesFailed(prev, ids));
      setCaptureMessage(result.message);
      return;
    }

    const jobIds = result.jobs.map((j) => j.id);
    setPages((prev) => markPagesUploaded(prev, ids, jobIds));
    setCaptureMessage(
      `Uploaded ${String(result.jobs.length)} page job(s) for ${recordType ?? "Baptism"}.`,
    );
  }

  async function retryFailedPageUploads() {
    const failed = pages.filter((p) => p.upload === "failed" && p.file);
    if (!failed.length) {
      if (!liveEligible) {
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
      } else {
        setCaptureMessage(
          "Failed pages have no local file to re-upload. Capture or choose files again.",
        );
      }
      return;
    }

    if (!liveEligible || !churchId) {
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
      return;
    }

    const ids = failed.map((p) => p.id);
    const files = failed.flatMap((p) => (p.file ? [p.file] : []));
    setPages((prev) =>
      prev.map((p) =>
        ids.includes(p.id) ? { ...p, upload: "uploading" as const } : p,
      ),
    );
    setUploadPending(true);
    setCaptureMessage(null);
    const result = await uploadOcrJobPages({
      churchId,
      files,
      recordType: recordType ?? "Baptism",
    });
    setUploadPending(false);
    if (!result.ok) {
      setPages((prev) => markPagesFailed(prev, ids));
      setCaptureMessage(result.message);
      return;
    }
    setPages((prev) =>
      markPagesUploaded(
        prev,
        ids,
        result.jobs.map((j) => j.id),
      ),
    );
    setCaptureMessage(`Retried upload for ${String(result.jobs.length)} page(s).`);
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
      void jobsPoll.reload();
    });
  };

  const runDownload = (job: OcrJobDto) => {
    if (!churchId) return;
    setDownloadPendingId(job.id);
    setActionMessage(null);
    void downloadOcrJobResults({
      churchId,
      jobId: job.id,
      filenameHint: `${(job.original_filename ?? job.filename).replace(/\s+/g, "-").toLowerCase()}.txt`,
    }).then((result) => {
      setDownloadPendingId(null);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(`Downloaded “${result.filename}”.`);
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
      void jobsPoll.reload();
    });
  };

  return (
    <PageLayout
      title="OCR Mobile"
      description="Mobile capture workflow for sacramental registry pages (blueprint productization)."
    >
      <Box maw={480} mx="auto">
        <PhaseRail phase={phase} pageCount={pages.length} />

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
                desktop batch. You can also continue and upload pages with the device camera or
                file picker.
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
                <Text size="sm" c="orange" role="status">
                  Camera permission is required to scan the parish QR code. You can still Continue
                  and use Capture / Choose files on the next step.
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
                    Device ready
                  </Text>
                </Group>
              )}

              <Group gap="sm">
                <Button
                  className="om-btn-ghost"
                  variant="secondary"
                  size="sm"
                  onAction={() => {
                    void requestConnectCamera();
                  }}
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
                Photograph registry pages or choose existing images. Quality warnings flag blur,
                glare, crop, and duplicates when present.
              </Text>
              <MantineSelect
                label="Record type"
                data={[...RECORD_TYPES]}
                value={recordType}
                onChange={setRecordType}
                allowDeselect={false}
              />
              {failedUploadCount > 0 ? (
                <Text size="sm" c="orange" role="status">
                  {`${String(failedUploadCount)} page upload(s) failed. Retry before review, or continue and use OCR-phase job Retry when live.`}
                </Text>
              ) : null}
              {captureMessage ? (
                <Text size="sm" role="status">
                  {captureMessage}
                </Text>
              ) : null}

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(event) => {
                  const list = event.currentTarget.files;
                  if (list?.length) void ingestFiles(list);
                  event.currentTarget.value = "";
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                style={{ display: "none" }}
                onChange={(event) => {
                  const list = event.currentTarget.files;
                  if (list?.length) void ingestFiles(list);
                  event.currentTarget.value = "";
                }}
              />

              {pages.length === 0 ? (
                <Box
                  h={120}
                  style={{
                    borderRadius: 8,
                    border: "1px dashed var(--mantine-color-default-border)",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--mantine-color-default-hover)",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    No pages yet — capture or choose files
                  </Text>
                </Box>
              ) : (
                <SimpleGrid cols={3} spacing="xs">
                  {pages.map((page) => (
                    <Box
                      key={page.id}
                      h={72}
                      p={4}
                      style={{
                        background: page.previewUrl
                          ? `center / cover no-repeat url(${page.previewUrl})`
                          : page.bg,
                        borderRadius: 6,
                        border:
                          selected?.id === page.id
                            ? "2px solid var(--mantine-color-gold-5)"
                            : "1px solid var(--mantine-color-default-border)",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedId(page.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Page ${String(page.n)}${page.filename ? `, ${page.filename}` : ""}${page.quality ? `, warning ${page.quality}` : ""}${page.upload === "failed" ? ", upload failed" : ""}${page.upload === "uploading" ? ", uploading" : ""}`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(page.id);
                        }
                      }}
                    >
                      <Text size="xs" fw={600} style={{ textShadow: "0 0 4px #fff" }}>
                        {page.n}
                      </Text>
                      {page.upload === "failed" ? (
                        <Badge size="xs" color="red" mt={4}>
                          failed
                        </Badge>
                      ) : page.upload === "uploading" ? (
                        <Badge size="xs" color="blue" mt={4}>
                          …
                        </Badge>
                      ) : page.quality ? (
                        <Badge size="xs" color="orange" mt={4}>
                          {page.quality}
                        </Badge>
                      ) : null}
                    </Box>
                  ))}
                </SimpleGrid>
              )}
              <Group gap="sm">
                <Button
                  className="om-btn-ghost"
                  variant="secondary"
                  size="sm"
                  isDisabled={uploadPending}
                  onAction={() => cameraInputRef.current?.click()}
                >
                  <Camera size={14} aria-hidden />
                  Capture
                </Button>
                <Button
                  className="om-btn-ghost"
                  variant="secondary"
                  size="sm"
                  isDisabled={uploadPending}
                  onAction={() => fileInputRef.current?.click()}
                >
                  <FolderOpen size={14} aria-hidden />
                  {uploadPending ? "Uploading…" : "Choose files"}
                </Button>
                {!liveEligible ? (
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    onAction={addMockPage}
                  >
                    Add sample
                  </Button>
                ) : null}
                {failedUploadCount > 0 ? (
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    isDisabled={uploadPending}
                    onAction={() => {
                      void retryFailedPageUploads();
                    }}
                  >
                    Retry failed uploads
                  </Button>
                ) : null}
                <Button
                  className="om-btn-primary"
                  size="sm"
                  isDisabled={pages.length === 0 || uploadPending}
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
                Fix or remove pages with warnings. Selected page:{" "}
                {selected ? selected.n : "none"}.
                {selected?.filename ? ` (${selected.filename})` : ""}
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
                  onAction={() => {
                    if (!selected) return;
                    setPages((prev) => {
                      const next = prev.filter((p) => p.id !== selected.id);
                      if (selected.previewUrl) {
                        URL.revokeObjectURL(selected.previewUrl);
                      }
                      const renumbered = next.map((p, i) => ({
                        ...p,
                        n: i + 1,
                        bg: thumbBg(i),
                      }));
                      setSelectedId(renumbered[0]?.id ?? null);
                      return renumbered;
                    });
                  }}
                />
              </Group>
              <Button
                className="om-btn-primary"
                size="sm"
                isDisabled={pages.length === 0}
                onAction={() => setPhase(4)}
              >
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
                  {OCR_LIVE_CUTOFF_NOTES.map((note) => (
                    <Text key={note} size="xs" c="dimmed">
                      {note}
                    </Text>
                  ))}
                  <Text size="sm" c="dimmed">
                    {jobsLoading
                      ? "Loading OCR jobs…"
                      : jobsPoll.shouldPoll
                        ? "Live church OCR jobs — refreshing while processing…"
                        : "Live church OCR jobs — Retry, Seed, and Download when eligible."}
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
                        const downloading = downloadPendingId === job.id;
                        const retryEligible = canRetryOcrJob(job);
                        const seedEligible = canSeedOcrJob(job);
                        const downloadEligible = canDownloadOcrJob(job);
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
                              {retryEligible || seedEligible || downloadEligible ? (
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
                                  {downloadEligible ? (
                                    <Button
                                      className="om-btn-ghost"
                                      variant="secondary"
                                      size="sm"
                                      isDisabled={downloading}
                                      onAction={() => runDownload(job)}
                                    >
                                      <Download size={14} aria-hidden />
                                      {downloading ? "…" : "Download"}
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
                      void jobsPoll.reload();
                    }}
                  >
                    <RefreshCw size={14} aria-hidden />
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
                  revokeCapturePreviewUrls(pages);
                  setPages([]);
                  setSelectedId(null);
                  setCaptureMessage(null);
                  setPhase(1);
                  setActionMessage(null);
                  setPendingSeedId(null);
                  setConnectMode("scan");
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
