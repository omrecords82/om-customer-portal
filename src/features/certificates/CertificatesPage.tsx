import {
  Badge,
  Card,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  downloadCertificatePdf,
  fetchCertificateHistory,
  startCertificateDraft,
} from "./certificatesApi";
import type { CertificateKind, CertificateRow } from "./certificatesData";

const KIND_LABEL: Record<CertificateKind, string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  chrismation: "Chrismation",
  reception: "Reception",
};

/**
 * Wave F — certificates list / generate chrome + live history.
 * Designer canvas stays app-owned (deferred); render needs studio template+record.
 */
export function CertificatesPage() {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly CertificateRow[]>([]);
  const [historySource, setHistorySource] = useState<"mock" | "live" | "empty">(
    "mock",
  );
  const [historyNote, setHistoryNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- certificate history bootstrap
    setLoading(true);
    void fetchCertificateHistory(user?.churchId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setRows([]);
        setHistorySource("empty");
        setHistoryNote(result.message);
        return;
      }
      setRows(result.rows);
      if (result.source === "live") {
        setHistorySource(result.rows.length === 0 ? "empty" : "live");
        setHistoryNote(
          result.rows.length === 0
            ? "No certificate history for this church yet."
            : null,
        );
      } else {
        setHistorySource("mock");
        setHistoryNote(
          "Preview rows (mock). Live history uses GET /api/certificates/history when AUTH_MODE=live and church context is present.",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.churchId]);

  const liveHistory = historySource === "live" && authMode === "live";

  return (
    <PageLayout
      title="Certificates"
      description="Issue and manage certificates of baptism, marriage, and reception."
    >
      <Stack gap="md">
        <Card padding="lg" maw={640}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Generate certificate
            </Title>
            <TextField
              label="Recipient name"
              value={recipient}
              onValueChange={setRecipient}
              placeholder="Full name as it should appear"
            />
            {status ? (
              <Text size="sm" role="status">
                {status}
              </Text>
            ) : null}
            <Button
              className="om-btn-primary"
              size="sm"
              accessibleLabel="Start certificate draft"
              onAction={() => {
                const result = startCertificateDraft({
                  recipient,
                  ...(user?.churchId != null
                    ? { churchId: user.churchId }
                    : {}),
                });
                if (!result.ok) {
                  setStatus(result.message);
                  return;
                }
                setStatus(result.message);
              }}
            >
              Start draft
            </Button>
            {authMode === "live" ? (
              <Text size="xs" c="dimmed">
                Live auth: history loads from GET /api/certificates/history.
                PDF render (POST /api/certificates/render) stays in Certificate
                Studio — requires template and record; designer canvas is deferred.
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                Preview mode: drafts and history rows are mock until live auth.
              </Text>
            )}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3} style={{ fontWeight: 500 }}>
                History
              </Title>
              <Text size="sm" c="dimmed">
                {loading
                  ? "Loading…"
                  : historySource === "live"
                    ? "live"
                    : historySource === "empty"
                      ? "empty"
                      : "mock"}
              </Text>
            </Group>
            {historyNote ? (
              <Text size="sm" c="dimmed" role="status">
                {historyNote}
              </Text>
            ) : null}
            {rows.length === 0 && !loading ? (
              <Text size="sm" c="dimmed">
                No certificates to show.
              </Text>
            ) : (
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
            )}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
