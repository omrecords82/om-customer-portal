import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  Select as MantineSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { AlertDialog } from "@om/ui/alert-dialog";
import { Button } from "@om/ui/button";
import { IconButton } from "@om/ui/icon-button";
import {
  CheckCircle2,
  Circle,
  Eye,
  Download,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { filterBatches } from "./filterBatches";
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
} from "./ocrApi";
import { useOcrJobsPolling } from "./useOcrJobsPolling";
import type { Batch, BatchStatus, ProcessingMode } from "./types";

function mapJobsToBatches(jobs: readonly OcrJobDto[]): Batch[] {
  return jobs.map((job) => {
    const status = mapOcrJobToWizardStatus(job) as BatchStatus;
    return {
      id: `job-${job.id}`,
      jobId: job.id,
      name: job.original_filename ?? job.filename,
      recordType: job.record_type
        ? job.record_type.charAt(0).toUpperCase() + job.record_type.slice(1)
        : "Baptism",
      submitted: job.created_at?.slice(0, 10) ?? "—",
      pages: 1,
      records: 0,
      mode: "standard" as const,
      status,
      needsReview: status === "ready-for-review" ? 1 : 0,
      reviewStatus: job.review_status ?? null,
      jobStatus: job.status,
      errorMessage: job.error_message ?? null,
    };
  });
}

type Screen =
  | "history"
  | "configure"
  | "upload"
  | "review"
  | "processing"
  | "results";

const STATUS_LABEL: Record<BatchStatus, string> = {
  draft: "Draft",
  uploading: "Uploading",
  processing: "Processing",
  "ready-for-review": "Ready for Review",
  completed: "Completed",
  failed: "Failed",
};

const INITIAL_BATCHES: Batch[] = [
  {
    id: "b1",
    name: "Baptism register 1920–1924",
    recordType: "Baptism",
    submitted: "2026-07-12",
    pages: 48,
    records: 214,
    mode: "standard",
    status: "ready-for-review",
    needsReview: 13,
  },
  {
    id: "b2",
    name: "Marriage ledger Book III",
    recordType: "Marriage",
    submitted: "2026-07-10",
    pages: 22,
    records: 61,
    mode: "autoseed",
    status: "processing",
    needsReview: 0,
  },
  {
    id: "b3",
    name: "Funeral entries 2019",
    recordType: "Funeral",
    submitted: "2026-07-02",
    pages: 16,
    records: 40,
    mode: "standard",
    status: "completed",
    needsReview: 0,
  },
];

const WIZARD_STEPS = ["Configure", "Upload", "Review", "Processing", "Results"] as const;

const STANDARD_STEPS = [
  "Upload complete",
  "Preparing images",
  "Running OCR",
  "Extracting records",
  "Matching clergy and locations",
  "Validating fields",
  "Checking for duplicates",
  "Preparing records for Review",
];

const TEMPLATES = [
  { value: "standard-registry", label: "Standard Parish Registry" },
  { value: "ledger-two-column", label: "Ledger — Two Column" },
  { value: "ledger-tabular", label: "Ledger — Tabular" },
  { value: "handwritten-form", label: "Handwritten Form" },
];

const STATUS_FILTER_DATA = [
  { value: "all", label: "All statuses" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

function WizardRail({ current }: { current: number }) {
  return (
    <Group gap="sm" mb="md" wrap="wrap" aria-label="OCR desktop wizard steps">
      {WIZARD_STEPS.map((label, index) => {
        const n = index + 1;
        const active = n === current;
        const done = n < current;
        return (
          <Group key={label} gap={6} wrap="nowrap">
            <Box
              w={22}
              h={22}
              style={{
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 600,
                background: done || active
                  ? "var(--mantine-color-navy-7)"
                  : "var(--mantine-color-default-hover)",
                color: done || active ? "white" : "var(--mantine-color-dimmed)",
              }}
              aria-current={active ? "step" : undefined}
            >
              {n}
            </Box>
            <Text
              size="sm"
              fw={active ? 600 : 400}
              {...(active ? {} : { c: "dimmed" as const })}
            >
              {label}
            </Text>
          </Group>
        );
      })}
    </Group>
  );
}

/**
 * Productized OM OCR Desktop blueprint (Mantine + @om/ui).
 * Screens: history → configure → upload → review → processing → results
 * Source UX: /blueprints/om-ocr-desktop
 */
export function OcrDesktopPage() {
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>("history");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [mockBatches, setMockBatches] = useState(INITIAL_BATCHES);
  const [sessionJobIds, setSessionJobIds] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState("Baptism register upload");
  const [recordType, setRecordType] = useState<string | null>("Baptism");
  const [template, setTemplate] = useState<string | null>("standard-registry");
  const [mode, setMode] = useState<ProcessingMode>("standard");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null);
  const [pendingSeedId, setPendingSeedId] = useState<string | null>(null);
  const [procStep, setProcStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const churchId = user?.churchId;
  const liveEligible =
    authMode === "live" && churchId != null && churchId > 0;

  const historyPoll = useOcrJobsPolling({
    churchId,
    enabled: liveEligible && screen === "history",
    limit: 50,
  });

  const sessionPoll = useOcrJobsPolling({
    churchId,
    enabled: liveEligible && screen === "processing" && sessionJobIds.length > 0,
    jobIds: sessionJobIds,
    limit: 50,
  });

  const historySource = liveEligible
    ? historyPoll.source === "live"
      ? "live"
      : historyPoll.source === "error"
        ? "error"
        : "loading"
    : "mock";

  const batches = useMemo(() => {
    if (liveEligible && historyPoll.source === "live") {
      return mapJobsToBatches(historyPoll.jobs);
    }
    if (liveEligible) return [];
    return mockBatches;
  }, [liveEligible, historyPoll.jobs, historyPoll.source, mockBatches]);

  const filteredBatches = useMemo(
    () =>
      filterBatches(batches, {
        query,
        status: (statusFilter ?? "all") as BatchStatus | "all",
      }),
    [batches, query, statusFilter],
  );

  const wizardIndex = useMemo(() => {
    const map: Record<Exclude<Screen, "history">, number> = {
      configure: 1,
      upload: 2,
      review: 3,
      processing: 4,
      results: 5,
    };
    return screen === "history" ? 0 : map[screen];
  }, [screen]);

  useEffect(() => {
    if (screen !== "processing") return;
    if (liveEligible && sessionJobIds.length > 0) {
      if (sessionPoll.allTerminal) {
        const t = window.setTimeout(() => setScreen("results"), 600);
        return () => window.clearTimeout(t);
      }
      return;
    }
    if (procStep >= STANDARD_STEPS.length) {
      const t = window.setTimeout(() => setScreen("results"), 600);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setProcStep((s) => s + 1), 700);
    return () => window.clearTimeout(t);
  }, [
    screen,
    procStep,
    liveEligible,
    sessionJobIds.length,
    sessionPoll.allTerminal,
  ]);

  const pendingDelete = batches.find((b) => b.id === pendingDeleteId) ?? null;
  const pendingSeed = batches.find((b) => b.id === pendingSeedId) ?? null;
  const liveHistory = historySource === "live";
  const historyEmpty =
    liveHistory && !historyPoll.loading && historyPoll.jobs.length === 0;
  const historyFilteredEmpty =
    filteredBatches.length === 0 && batches.length > 0;

  const runRetry = (batch: Batch) => {
    if (!churchId || !batch.jobId) return;
    setActionPendingId(batch.id);
    setActionMessage(null);
    void retryChurchOcrJob(churchId, batch.jobId).then((result) => {
      setActionPendingId(null);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(`Retry queued for “${batch.name}”.`);
      void historyPoll.reload();
    });
  };

  const runDownload = (batch: Batch) => {
    if (!churchId || !batch.jobId) return;
    setDownloadPendingId(batch.id);
    setActionMessage(null);
    void downloadOcrJobResults({
      churchId,
      jobId: batch.jobId,
      filenameHint: `${batch.name.replace(/\s+/g, "-").toLowerCase()}.txt`,
    }).then((result) => {
      setDownloadPendingId(null);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(`Downloaded “${result.filename}”.`);
    });
  };

  const runSeed = (batch: Batch) => {
    if (!churchId || !batch.jobId) return;
    setActionPendingId(batch.id);
    setActionMessage(null);
    void seedChurchOcrJob(churchId, batch.jobId).then((result) => {
      setActionPendingId(null);
      setPendingSeedId(null);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(`Seeded “${batch.name}” into records.`);
      void historyPoll.reload();
    });
  };

  const batchActions = (batch: Batch) => {
    const pending = actionPendingId === batch.id;
    const downloading = downloadPendingId === batch.id;
    const retryEligible =
      liveHistory &&
      !!batch.jobId &&
      canRetryOcrJob({
        status: batch.jobStatus ?? batch.status,
        ...(batch.reviewStatus !== undefined
          ? { review_status: batch.reviewStatus }
          : {}),
      });
    const downloadEligible =
      liveHistory &&
      !!batch.jobId &&
      canDownloadOcrJob({
        status: batch.jobStatus ?? batch.status,
        ...(batch.reviewStatus !== undefined
          ? { review_status: batch.reviewStatus }
          : {}),
      });
    const seedEligible =
      liveHistory &&
      !!batch.jobId &&
      canSeedOcrJob({
        ...(batch.reviewStatus !== undefined
          ? { review_status: batch.reviewStatus }
          : {}),
      });

    return (
      <Group gap={4} wrap="nowrap">
        <Button
          className="om-btn-ghost"
          variant="secondary"
          size="sm"
          onAction={() => setScreen("review")}
        >
          <Eye size={14} aria-hidden />
          Open
        </Button>
        {retryEligible ? (
          <Button
            className="om-btn-ghost"
            variant="secondary"
            size="sm"
            isDisabled={pending}
            onAction={() => runRetry(batch)}
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
            onAction={() => runDownload(batch)}
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
            onAction={() => setPendingSeedId(batch.id)}
          >
            Seed
          </Button>
        ) : null}
        {!liveHistory ? (
          <IconButton
            className="om-header-icon-btn"
            variant="quiet"
            accessibleLabel={`Delete ${batch.name}`}
            icon={<Trash2 size={14} aria-hidden />}
            onAction={() => setPendingDeleteId(batch.id)}
          />
        ) : null}
      </Group>
    );
  };

  return (
    <PageLayout
      title="OCR Desktop"
      description="Desktop batch upload and OCR processing for sacramental registry pages."
      {...(screen === "history"
        ? {
            action: (
              <Button
                className="om-btn-primary"
                size="sm"
                onAction={() => {
                  setScreen("configure");
                  setProcStep(0);
                  setUploadedCount(0);
                }}
              >
                <Plus size={14} aria-hidden />
                New batch
              </Button>
            ),
          }
        : {})}
    >
      {screen !== "history" && <WizardRail current={wizardIndex} />}

      {screen === "history" && (
        <Stack gap="md">
          {liveEligible ? (
            <Stack gap={4}>
              {OCR_LIVE_CUTOFF_NOTES.map((note) => (
                <Text key={note} size="xs" c="dimmed">
                  {note}
                </Text>
              ))}
            </Stack>
          ) : null}
          <Text size="sm" c="dimmed">
            {historyPoll.loading
              ? "Loading OCR jobs…"
              : historySource === "live"
                ? historyPoll.shouldPoll
                  ? "Live OCR jobs — refreshing while processing…"
                  : "Live OCR jobs — Retry, Seed, and Download use church-scoped routes."
                : historySource === "error"
                  ? `Could not load OCR jobs (${historyPoll.error ?? "request failed"}).`
                  : "Mock history (set VITE_PORTAL_AUTH_MODE=live with church context for API jobs)."}
          </Text>
          {actionMessage ? (
            <Text size="sm" role="status">
              {actionMessage}
            </Text>
          ) : null}
          <Group justify="space-between" wrap="wrap" align="flex-end">
            <Group gap="sm" wrap="wrap" align="flex-end">
              <TextInput
                placeholder="Search batches"
                aria-label="Search batches"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                maw={280}
                styles={{ input: { fontSize: 13.5 } }}
              />
              <MantineSelect
                aria-label="Filter by status"
                data={STATUS_FILTER_DATA}
                value={statusFilter}
                onChange={setStatusFilter}
                maw={200}
              />
            </Group>
            <Group gap={4}>
              <IconButton
                className="om-header-icon-btn"
                variant="quiet"
                accessibleLabel="Table view"
                icon={<List size={16} aria-hidden />}
                onAction={() => setViewMode("table")}
              />
              <IconButton
                className="om-header-icon-btn"
                variant="quiet"
                accessibleLabel="Card view"
                icon={<LayoutGrid size={16} aria-hidden />}
                onAction={() => setViewMode("cards")}
              />
            </Group>
          </Group>

          {historyEmpty ? (
            <Text size="sm" c="dimmed">
              No OCR jobs yet. Start a batch upload or capture pages from OCR Mobile.
            </Text>
          ) : historyFilteredEmpty ? (
            <Text size="sm" c="dimmed">
              No batches match the current filters.
            </Text>
          ) : null}

          {liveHistory ? (
            <Group gap="sm">
              <Button
                className="om-btn-ghost"
                variant="secondary"
                size="sm"
                isDisabled={historyPoll.loading}
                onAction={() => {
                  void historyPoll.reload();
                }}
              >
                <RefreshCw size={14} aria-hidden />
                Refresh
              </Button>
            </Group>
          ) : null}

          {viewMode === "table" ? (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Batch</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Submitted</Table.Th>
                  <Table.Th>Pages</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Review</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredBatches.map((batch) => (
                  <Table.Tr key={batch.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {batch.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{batch.recordType}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{batch.submitted}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{batch.pages}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="navy">
                        {STATUS_LABEL[batch.status]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={batch.needsReview > 0 ? "orange" : "dimmed"}>
                        {batch.needsReview}
                      </Text>
                    </Table.Td>
                    <Table.Td>{batchActions(batch)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {filteredBatches.map((batch) => (
                <Card key={batch.id} padding="md">
                  <Stack gap="xs">
                    <Text fw={500}>{batch.name}</Text>
                    <Group gap="xs">
                      <Badge variant="light">{batch.recordType}</Badge>
                      <Badge variant="outline">{STATUS_LABEL[batch.status]}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {`${String(batch.pages)} pages · ${String(batch.records)} records`}
                      {batch.needsReview > 0
                        ? ` · ${String(batch.needsReview)} need review`
                        : ""}
                    </Text>
                    <Group gap="sm">
                      {batchActions(batch)}
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}

          <AlertDialog
            title="Delete batch?"
            description={
              pendingDelete
                ? `Remove “${pendingDelete.name}” from history? This mock action cannot be undone.`
                : "Remove this batch from history?"
            }
            confirmLabel="Delete batch"
            cancelLabel="Cancel"
            intent="destructive"
            isOpen={pendingDeleteId !== null}
            onOpenChange={(open) => {
              if (!open) setPendingDeleteId(null);
            }}
            onConfirm={() => {
              if (pendingDeleteId && !liveHistory) {
                setMockBatches((prev) => prev.filter((b) => b.id !== pendingDeleteId));
              }
              setPendingDeleteId(null);
            }}
            onCancel={() => setPendingDeleteId(null)}
          />

          <AlertDialog
            title="Seed to records?"
            description={
              pendingSeed
                ? `Seed “${pendingSeed.name}” into the church record tables? This writes live sacramental data.`
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
        </Stack>
      )}

      {screen === "configure" && (
        <Card padding="lg" maw={720}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Configure batch
            </Title>
            <TextInput
              label="Batch name"
              value={batchName}
              onChange={(event) => setBatchName(event.currentTarget.value)}
            />
            <MantineSelect
              label="Record type"
              data={["Baptism", "Marriage", "Funeral", "Chrismation"]}
              value={recordType}
              onChange={setRecordType}
            />
            <MantineSelect
              label="Page template"
              data={TEMPLATES}
              value={template}
              onChange={setTemplate}
            />
            <Group gap="sm">
              <Button
                className={mode === "standard" ? "om-btn-primary" : "om-btn-ghost"}
                variant={mode === "standard" ? "primary" : "secondary"}
                size="sm"
                onAction={() => setMode("standard")}
              >
                Standard Review
              </Button>
              <Button
                className={mode === "autoseed" ? "om-btn-primary" : "om-btn-ghost"}
                variant={mode === "autoseed" ? "primary" : "secondary"}
                size="sm"
                onAction={() => setMode("autoseed")}
              >
                Auto-seed eligible
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              {mode === "standard"
                ? "Extract records and send them to Review before they are added to the church database."
                : "Automatically approve records that pass validation; send the rest to Review."}
            </Text>
            <Group gap="sm">
              <Button className="om-btn-ghost" variant="secondary" size="sm" onAction={() => setScreen("history")}>
                Cancel
              </Button>
              <Button className="om-btn-primary" size="sm" onAction={() => setScreen("upload")}>
                Continue to upload
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {screen === "upload" && (
        <Card padding="lg" maw={720}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Upload pages
            </Title>
            <Box
              h={160}
              style={{
                border: "1px dashed var(--mantine-color-default-border)",
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                background: "var(--mantine-color-default-hover)",
              }}
            >
              <Stack gap={6} align="center">
                <Upload size={28} aria-hidden />
                <Text size="sm" c="dimmed">
                  {authMode === "live" && user?.churchId
                    ? "Choose scanned page images to upload"
                    : "Drop scanned pages here (mock)"}
                </Text>
                {authMode === "live" && user?.churchId ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const list = event.currentTarget.files;
                        if (!list?.length || !user.churchId) return;
                        const files = Array.from(list);
                        setUploadPending(true);
                        setUploadMessage(null);
                        void uploadOcrJobPages({
                          churchId: user.churchId,
                          files,
                          recordType: recordType ?? "Baptism",
                          recordLayoutMode: template ?? "auto",
                        }).then((result) => {
                          setUploadPending(false);
                          if (!result.ok) {
                            setUploadMessage(result.message);
                            return;
                          }
                          setUploadedCount((n) => n + result.jobs.length);
                          setSessionJobIds((prev) => [
                            ...prev,
                            ...result.jobs.map((job) => job.id),
                          ]);
                          setUploadMessage(
                            `Uploaded ${String(result.jobs.length)} page job(s).`,
                          );
                        });
                        event.currentTarget.value = "";
                      }}
                    />
                    <Button
                      className="om-btn-ghost"
                      variant="secondary"
                      size="sm"
                      isDisabled={uploadPending}
                      onAction={() => fileInputRef.current?.click()}
                    >
                      {uploadPending ? "Uploading…" : "Choose files"}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    onAction={() => setUploadedCount((n) => n + 4)}
                  >
                    Add sample pages
                  </Button>
                )}
              </Stack>
            </Box>
            {uploadMessage ? (
              <Text size="sm" role="status">
                {uploadMessage}
              </Text>
            ) : null}
            <Text size="sm">
              Uploaded: <Text span fw={600}>{uploadedCount}</Text> pages
            </Text>
            <Group gap="sm">
              <Button className="om-btn-ghost" variant="secondary" size="sm" onAction={() => setScreen("configure")}>
                Back
              </Button>
              <Button
                className="om-btn-primary"
                size="sm"
                isDisabled={uploadedCount === 0}
                onAction={() => setScreen("review")}
              >
                Review {uploadedCount > 0 ? uploadedCount : ""} pages
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {screen === "review" && (
        <Card padding="lg" maw={720}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Review pages
            </Title>
            <Text size="sm" c="dimmed">
              Rotate, crop, or remove pages before OCR. Thumbnail strip is mocked.
            </Text>
            <SimpleGrid cols={4} spacing="xs">
              {Array.from({ length: Math.max(uploadedCount, 4) }, (_, i) => (
                <Box
                  key={i}
                  h={88}
                  style={{
                    background: "var(--mantine-color-navy-0)",
                    borderRadius: 6,
                    border: "1px solid var(--mantine-color-default-border)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Text size="xs">{`Page ${String(i + 1)}`}</Text>
                </Box>
              ))}
            </SimpleGrid>
            <Group gap="sm">
              <Button className="om-btn-ghost" variant="secondary" size="sm" onAction={() => setScreen("upload")}>
                Back
              </Button>
              <Button
                className="om-btn-primary"
                size="sm"
                onAction={() => {
                  setProcStep(0);
                  setScreen("processing");
                }}
              >
                Start OCR
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {screen === "processing" && (
        <Card padding="lg" maw={720}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Processing
            </Title>
            <Text size="sm" c="dimmed">
              Batch: {batchName || "Untitled Batch"} · Mode: {mode}
              {liveEligible && sessionJobIds.length > 0
                ? sessionPoll.shouldPoll
                  ? " · polling live job status"
                  : " · live jobs"
                : ""}
            </Text>
            {liveEligible && sessionJobIds.length > 0 ? (
              <>
                <Progress
                  value={
                    sessionPoll.jobs.length === 0
                      ? 10
                      : Math.round(
                          (sessionPoll.jobs.filter(
                            (job) =>
                              mapOcrJobToWizardStatus(job) !== "processing",
                          ).length /
                            Math.max(sessionPoll.jobs.length, 1)) *
                            100,
                        )
                  }
                  color="navy"
                  size="sm"
                  radius="xl"
                />
                <Stack gap="xs" role="list" aria-label="Session OCR jobs">
                  {sessionPoll.jobs.map((job) => {
                    const wizard = mapOcrJobToWizardStatus(job);
                    return (
                      <Group key={job.id} gap="sm" role="listitem" wrap="nowrap">
                        <Badge variant="light" color={wizard === "failed" ? "red" : "navy"}>
                          {STATUS_LABEL[wizard as BatchStatus]}
                        </Badge>
                        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                          {job.original_filename ?? job.filename}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
                {sessionPoll.jobs.length === 0 && !sessionPoll.loading ? (
                  <Text size="sm" c="dimmed">
                    Waiting for uploaded jobs to appear in the church queue…
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Progress
                  value={Math.min(100, (procStep / STANDARD_STEPS.length) * 100)}
                  color="navy"
                  size="sm"
                  radius="xl"
                />
                <Stack gap="xs" role="list" aria-label="Processing steps">
                  {STANDARD_STEPS.map((label, idx) => {
                    const done = idx < procStep;
                    const active = idx === procStep;
                    return (
                      <Group key={label} gap="sm" role="listitem">
                        {done ? (
                          <CheckCircle2 size={16} color="var(--mantine-color-teal-6)" aria-hidden />
                        ) : active ? (
                          <Loader2 size={16} className="om-spin" color="var(--mantine-color-gold-6)" aria-hidden />
                        ) : (
                          <Circle size={16} color="var(--mantine-color-dimmed)" aria-hidden />
                        )}
                        <Text
                          size="sm"
                          fw={active ? 500 : 400}
                          {...(done || active ? {} : { c: "dimmed" as const })}
                        >
                          {label}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </>
            )}
          </Stack>
        </Card>
      )}

      {screen === "results" && (
        <Card padding="lg" maw={720}>
          <Stack gap="md">
            <Group gap="sm">
              <CheckCircle2 size={22} color="var(--mantine-color-teal-6)" aria-hidden />
              <Title order={3} style={{ fontWeight: 500 }}>
                Batch ready
              </Title>
            </Group>
            <Text size="sm" c="dimmed">
              {historySource === "live"
                ? `${batchName} finished. Use history Retry/Seed for live job actions.`
                : `${batchName} finished mock OCR. Enable live auth + church context for job APIs.`}
            </Text>
            <Group gap="sm">
              <Button className="om-btn-ghost" variant="secondary" size="sm" onAction={() => setScreen("history")}>
                <FileText size={14} aria-hidden />
                Back to history
              </Button>
              <Button className="om-btn-primary" size="sm" onAction={() => setScreen("review")}>
                Open review
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </PageLayout>
  );
}
