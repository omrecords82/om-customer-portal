import {
  Badge,
  Card,
  Group,
  Select as MantineSelect,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  downloadCertificatePdf,
  fetchCertificateHistory,
  fetchCertificateRecords,
  fetchCertificateTemplates,
  renderCertificate,
  type CertificateRecordOption,
  type CertificateStudioType,
  type CertificateTemplateOption,
} from "./certificatesApi";
import type { CertificateKind, CertificateRow } from "./certificatesData";
import {
  buildCertificateHistoryNote,
  buildCertificateRecordsNote,
  buildCertificateTemplatesNote,
  buildHistoryEmptyTableCopy,
  classifyRenderStatusMessage,
  historySourceBadgeLabel,
  resolveCertificateHistorySource,
  shouldShowHistoryRefresh,
  type CertificateHistorySource,
} from "./certificatesPresentation";

const KIND_LABEL: Record<CertificateKind, string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  chrismation: "Chrismation",
  reception: "Reception",
};

const STUDIO_TYPE_OPTIONS: { value: CertificateStudioType; label: string }[] = [
  { value: "baptism", label: "Baptism" },
  { value: "marriage", label: "Marriage" },
  { value: "reception", label: "Reception" },
];

const RECORD_SEARCH_DEBOUNCE_MS = 300;

/**
 * Wave F — certificates list / generate chrome + live history + render.
 * Designer canvas stays app-owned (deferred).
 */
export function CertificatesPage() {
  const { user } = useAuth();
  const liveAuth = authMode === "live";
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly CertificateRow[]>([]);
  const [historySource, setHistorySource] = useState<CertificateHistorySource>(
    "mock",
  );
  const [historyNote, setHistoryNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [certType, setCertType] = useState<CertificateStudioType>("baptism");
  const [templates, setTemplates] = useState<
    readonly CertificateTemplateOption[]
  >([]);
  const [templatesNote, setTemplatesNote] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [records, setRecords] = useState<readonly CertificateRecordOption[]>(
    [],
  );
  const [recordsNote, setRecordsNote] = useState<string | null>(null);
  const [recordId, setRecordId] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [debouncedRecordSearch, setDebouncedRecordSearch] = useState("");
  const [listsLoading, setListsLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [lastHistoryId, setLastHistoryId] = useState<number | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedRecordSearch(recordSearch),
      RECORD_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [recordSearch]);

  const reloadHistory = useCallback(() => {
    setLoading(true);
    void fetchCertificateHistory(user?.churchId).then((result) => {
      setLoading(false);
      const source = resolveCertificateHistorySource({
        ok: result.ok,
        fetchSource: result.ok ? result.source : "live",
        rowCount: result.ok ? result.rows.length : 0,
      });
      setHistorySource(source);
      if (!result.ok) {
        setRows([]);
        setHistoryNote(
          buildCertificateHistoryNote({
            source: "empty",
            errorMessage: result.message,
          }),
        );
        return;
      }
      setRows(result.rows);
      setHistoryNote(
        buildCertificateHistoryNote({
          source,
          ...(source === "empty" && !result.rows.length
            ? {}
            : { errorMessage: null }),
        }),
      );
    });
  }, [user?.churchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- certificate history bootstrap
    reloadHistory();
  }, [reloadHistory]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- template picker bootstrap
    setListsLoading(true);
    setTemplateId("");
    setRecordId("");
    void fetchCertificateTemplates({
      ...(user?.churchId != null ? { churchId: user.churchId } : {}),
      certificateType: certType,
    }).then((tplResult) => {
      if (cancelled) return;
      setListsLoading(false);
      if (!tplResult.ok) {
        setTemplates([]);
        setTemplatesNote(tplResult.message);
        return;
      }
      setTemplates(tplResult.templates);
      setTemplatesNote(
        buildCertificateTemplatesNote({
          source: tplResult.source,
          count: tplResult.templates.length,
        }),
      );
      if (tplResult.templates.length > 0) {
        const def = tplResult.templates.find((t) => t.isDefault);
        if (def) setTemplateId(String(def.id));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.churchId, certType]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- record picker bootstrap
    setListsLoading(true);
    void fetchCertificateRecords({
      ...(user?.churchId != null ? { churchId: user.churchId } : {}),
      certificateType: certType,
      search: debouncedRecordSearch,
    }).then((recResult) => {
      if (cancelled) return;
      setListsLoading(false);
      if (!recResult.ok) {
        setRecords([]);
        setRecordsNote(recResult.message);
        return;
      }
      setRecords(recResult.records);
      setRecordsNote(
        buildCertificateRecordsNote({
          source: recResult.source,
          count: recResult.records.length,
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user?.churchId, certType, debouncedRecordSearch]);

  const liveHistory = historySource === "live" && liveAuth;
  const canRender =
    Boolean(templateId.trim()) &&
    Boolean(recordId.trim()) &&
    !rendering;
  const statusTone = classifyRenderStatusMessage(status);
  const historyEmptyCopy = buildHistoryEmptyTableCopy(historySource, loading);
  const showHistoryRefresh = shouldShowHistoryRefresh(liveAuth, historySource);

  const templateSelectData = templates.map((t) => ({
    value: String(t.id),
    label: `${t.name}${t.isDefault ? " (Default)" : ""}${
      t.scopeLabel === "global" ? " — Global" : ""
    }`,
  }));

  const recordSelectData = records.map((r) => ({
    value: String(r.id),
    label: r.dateLabel ? `${r.label} · ${r.dateLabel}` : r.label,
  }));

  function handleRender(force = false) {
    setRendering(true);
    setStatus(null);
    setLastHistoryId(null);
    void renderCertificate({
      templateId,
      recordId,
      certificateType: certType,
      ...(user?.churchId != null ? { churchId: user.churchId } : {}),
      ...(force ? { force: true } : {}),
    }).then((result) => {
      setRendering(false);
      if (!result.ok) {
        const missing =
          result.missingFields?.length
            ? ` Missing: ${result.missingFields.join(", ")}.`
            : "";
        setStatus(`${result.message}${missing}`);
        return;
      }
      const { historyId, jobId, status: renderStatus } = result.result;
      setLastHistoryId(historyId);
      const parts = [
        `Certificate rendered (${renderStatus}).`,
        historyId != null ? `History #${String(historyId)}.` : null,
        jobId != null ? `Job #${String(jobId)}.` : null,
      ].filter(Boolean);
      setStatus(parts.join(" "));
      reloadHistory();
      if (historyId != null) {
        void downloadCertificatePdf(
          historyId,
          `certificate-${String(historyId)}.pdf`,
        ).then((dl) => {
          if (!dl.ok) {
            setStatus(
              (prev) =>
                `${prev ?? ""} Download deferred: ${dl.message}`.trim(),
            );
          }
        });
      }
    });
  }

  return (
    <PageLayout
      title="Certificates"
      description="Issue and manage certificates of baptism, marriage, and reception."
    >
      <Stack gap="md">
        <Card padding="lg" maw={720}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Generate certificate
            </Title>

            <MantineSelect
              label="Certificate type"
              aria-label="Certificate type"
              data={STUDIO_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={certType}
              onChange={(value) => {
                if (
                  value === "baptism" ||
                  value === "marriage" ||
                  value === "reception"
                ) {
                  setCertType(value);
                }
              }}
              allowDeselect={false}
            />

            {templateSelectData.length > 0 ? (
              <MantineSelect
                label="Template"
                aria-label="Certificate template"
                data={templateSelectData}
                value={templateId || null}
                onChange={(value) => setTemplateId(value ?? "")}
                searchable
                placeholder={listsLoading ? "Loading…" : "Select template"}
              />
            ) : (
              <TextInput
                label="Template id"
                aria-label="Template id"
                value={templateId}
                onChange={(e) => setTemplateId(e.currentTarget.value)}
                placeholder="Numeric template_id"
              />
            )}
            {templatesNote ? (
              <Text
                size="xs"
                c={templatesNote.includes("unavailable") ? "red" : "dimmed"}
                role={templatesNote.includes("unavailable") ? "alert" : "status"}
              >
                {templatesNote}
              </Text>
            ) : null}

            <Group align="flex-end" wrap="wrap" gap="sm">
              <TextInput
                label="Search records"
                aria-label="Search sacramental records"
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.currentTarget.value)}
                placeholder="Name…"
                maw={220}
                style={{ flex: 1 }}
              />
            </Group>

            {recordSelectData.length > 0 ? (
              <MantineSelect
                label="Sacramental record"
                aria-label="Sacramental record"
                data={recordSelectData}
                value={recordId || null}
                onChange={(value) => setRecordId(value ?? "")}
                searchable
                placeholder={listsLoading ? "Loading…" : "Select record"}
              />
            ) : (
              <TextInput
                label="Record id"
                aria-label="Record id"
                value={recordId}
                onChange={(e) => setRecordId(e.currentTarget.value)}
                placeholder="Numeric record_id"
              />
            )}
            {recordsNote ? (
              <Text
                size="xs"
                c={recordsNote.includes("unavailable") ? "red" : "dimmed"}
                role={recordsNote.includes("unavailable") ? "alert" : "status"}
              >
                {recordsNote}
              </Text>
            ) : null}

            {status ? (
              <Text
                size="sm"
                {...(statusTone === "error"
                  ? { c: "red" as const }
                  : statusTone === "success"
                    ? { c: "teal" as const }
                    : {})}
                role={statusTone === "neutral" ? "status" : "alert"}
              >
                {status}
              </Text>
            ) : null}

            {lastHistoryId != null ? (
              <Group gap="sm">
                <Button
                  size="sm"
                  accessibleLabel="Download generated certificate PDF"
                  isDisabled={downloadingId === String(lastHistoryId)}
                  onAction={() => {
                    const id = String(lastHistoryId);
                    setDownloadingId(id);
                    void downloadCertificatePdf(
                      lastHistoryId,
                      `certificate-${id}.pdf`,
                    ).then((result) => {
                      setDownloadingId(null);
                      if (!result.ok) setStatus(result.message);
                    });
                  }}
                >
                  {downloadingId === String(lastHistoryId)
                    ? "Downloading…"
                    : "Download PDF"}
                </Button>
                <Text size="xs" c="dimmed">
                  History #{String(lastHistoryId)} — also listed below after
                  refresh.
                </Text>
              </Group>
            ) : null}

            <Group gap="sm">
              <Button
                className="om-btn-primary"
                size="sm"
                accessibleLabel="Generate certificate PDF"
                isDisabled={!canRender}
                onAction={() => handleRender(false)}
              >
                {rendering ? "Generating…" : "Generate PDF"}
              </Button>
              {status?.toLowerCase().includes("missing") ? (
                <Button
                  size="sm"
                  accessibleLabel="Generate certificate anyway"
                  isDisabled={!canRender}
                  onAction={() => handleRender(true)}
                >
                  Generate anyway
                </Button>
              ) : null}
            </Group>

            {liveAuth ? (
              <Text size="xs" c="dimmed">
                Live auth: POST /api/certificates/render with template_id +
                record_id (and church context). Designer canvas stays
                app-owned / deferred.
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                Preview/mock mode: generate will not call the live render API
                and will not report fake success. Switch AUTH_MODE=live with
                church context for real PDFs.
              </Text>
            )}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <Title order={3} style={{ fontWeight: 500 }}>
                History
              </Title>
              <Group gap="sm">
                {showHistoryRefresh ? (
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    isDisabled={loading}
                    accessibleLabel="Refresh certificate history"
                    onAction={() => {
                      reloadHistory();
                    }}
                  >
                    <RefreshCw size={14} aria-hidden />
                    Refresh
                  </Button>
                ) : null}
                <Text size="sm" c="dimmed">
                  {historySourceBadgeLabel(historySource, loading)}
                </Text>
              </Group>
            </Group>
            {historyNote ? (
              <Text
                size="sm"
                c={historySource === "empty" && liveAuth ? "red" : "dimmed"}
                role={
                  historySource === "empty" && liveAuth && historyNote.includes("unavailable")
                    ? "alert"
                    : "status"
                }
              >
                {historyNote}
              </Text>
            ) : null}
            {historyEmptyCopy ? (
              <Text size="sm" c="dimmed">
                {historyEmptyCopy}
              </Text>
            ) : null}
            {rows.length > 0 ? (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Recipient</Table.Th>
                    <Table.Th>Kind</Table.Th>
                    <Table.Th>Issued</Table.Th>
                    <Table.Th>Template</Table.Th>
                    <Table.Th>Status</Table.Th>
                    {liveHistory ? <Table.Th>PDF</Table.Th> : null}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {row.recipient}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{KIND_LABEL[row.kind]}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{row.issued}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {row.templateName ?? "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={
                            row.status === "issued"
                              ? "teal"
                              : row.status === "draft"
                                ? "orange"
                                : "gray"
                          }
                        >
                          {row.status}
                        </Badge>
                      </Table.Td>
                      {liveHistory ? (
                        <Table.Td>
                          <Button
                            size="sm"
                            accessibleLabel={`Download certificate ${row.id}`}
                            isDisabled={downloadingId === row.id}
                            onAction={() => {
                              setDownloadingId(row.id);
                              setStatus(null);
                              void downloadCertificatePdf(
                                row.id,
                                `certificate-${row.id}.pdf`,
                              ).then((result) => {
                                setDownloadingId(null);
                                if (!result.ok) {
                                  setStatus(result.message);
                                }
                              });
                            }}
                          >
                            {downloadingId === row.id
                              ? "Downloading…"
                              : "Download"}
                          </Button>
                        </Table.Td>
                      ) : null}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : null}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
