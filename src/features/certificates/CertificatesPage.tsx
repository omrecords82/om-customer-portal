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
  fetchCertificateHistory,
  startCertificateDraft,
} from "./certificatesApi";
import type { CertificateRow } from "./certificatesData";

const KIND_LABEL: Record<CertificateRow["kind"], string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  chrismation: "Chrismation",
};

/**
 * Wave F — certificates list / generate chrome + live history seam stub.
 * Designer canvas stays app-owned later.
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
          "Preview rows (mock). Live history uses /api/certificates/history when auth is live.",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.churchId]);

  return (
    <PageLayout
      title="Certificates"
      description="Issue and manage certificates of baptism, marriage, and chrismation."
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
                if (result.source === "mock") {
                  setStatus(
                    `Draft started for ${recipient.trim()} (mock). Canvas designer is deferred.`,
                  );
                  return;
                }
                setStatus(
                  `Draft stub ${result.draftId} created. Full render/history API wiring is deferred.`,
                );
              }}
            >
              Start draft
            </Button>
            {authMode === "live" ? (
              <Text size="xs" c="dimmed">
                Live auth: draft seam is stubbed until Certificate Studio render ships.
              </Text>
            ) : null}
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
                    <Table.Th>Status</Table.Th>
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
