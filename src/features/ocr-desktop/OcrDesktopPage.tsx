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
import { Button } from "@om/ui/button";
import { IconButton } from "@om/ui/icon-button";
import {
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "../../components/PageLayout";

type Screen =
  | "history"
  | "configure"
  | "upload"
  | "review"
  | "processing"
  | "results";

type ProcessingMode = "standard" | "autoseed";

type BatchStatus =
  | "draft"
  | "uploading"
  | "processing"
  | "ready-for-review"
  | "completed"
  | "failed";

type Batch = {
  readonly id: string;
  readonly name: string;
  readonly recordType: string;
  readonly submitted: string;
  readonly pages: number;
  readonly records: number;
  readonly mode: ProcessingMode;
  readonly status: BatchStatus;
  readonly needsReview: number;
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  draft: "Draft",
  uploading: "Uploading",
  processing: "Processing",
  "ready-for-review": "Ready for Review",
  completed: "Completed",
  failed: "Failed",
};

const MOCK_BATCHES: Batch[] = [
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
  const [screen, setScreen] = useState<Screen>("history");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [batchName, setBatchName] = useState("Baptism register upload");
  const [recordType, setRecordType] = useState<string | null>("Baptism");
  const [template, setTemplate] = useState<string | null>("standard-registry");
  const [mode, setMode] = useState<ProcessingMode>("standard");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [procStep, setProcStep] = useState(0);

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
    if (procStep >= STANDARD_STEPS.length) {
      const t = window.setTimeout(() => setScreen("results"), 600);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setProcStep((s) => s + 1), 700);
    return () => window.clearTimeout(t);
  }, [screen, procStep]);

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
          <Group justify="space-between" wrap="wrap">
            <TextInput
              placeholder="Search batches"
              aria-label="Search batches"
              maw={280}
              styles={{ input: { fontSize: 13.5 } }}
            />
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
                {MOCK_BATCHES.map((batch) => (
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
                    <Table.Td>
                      <Button
                        className="om-btn-ghost"
                        variant="secondary"
                        size="sm"
                        onAction={() => setScreen("review")}
                      >
                        <Eye size={14} aria-hidden />
                        Open
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {MOCK_BATCHES.map((batch) => (
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
                    <Button
                      className="om-btn-ghost"
                      variant="secondary"
                      size="sm"
                      onAction={() => setScreen("configure")}
                    >
                      Continue
                    </Button>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
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
                  Drop scanned pages here (mock)
                </Text>
                <Button
                  className="om-btn-ghost"
                  variant="secondary"
                  size="sm"
                  onAction={() => setUploadedCount((n) => n + 4)}
                >
                  Add sample pages
                </Button>
              </Stack>
            </Box>
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
            </Text>
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
              {batchName} finished mock OCR. Wire real APIs after portal auth (Wave B).
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
