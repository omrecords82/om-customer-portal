import { Alert, Badge, Card, Group, Stack, Table, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { useCallback, useEffect, useState } from "react";

import { fetchBaptismHistory } from "./baptismEditorApi";
import {
  buildHistoryEmptyCopy,
  buildHistoryErrorCopy,
  formatHistoryTimestamp,
  formatHistoryTypeLabel,
  type BaptismHistoryEntry,
} from "./baptismEditorPresentation";

type BaptismHistoryPanelProps = {
  readonly churchId: number;
  readonly recordId: number | null;
  readonly refreshKey?: number;
};

export function BaptismHistoryPanel({
  churchId,
  recordId,
  refreshKey = 0,
}: BaptismHistoryPanelProps) {
  const [entries, setEntries] = useState<readonly BaptismHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (recordId == null || churchId <= 0) {
      setEntries([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await fetchBaptismHistory(churchId, recordId);
    setLoading(false);

    if (!result.ok) {
      setEntries([]);
      setError(buildHistoryErrorCopy(result.message));
      return;
    }

    setEntries(result.data);
  }, [churchId, recordId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, refreshKey]);

  const emptyCopy = buildHistoryEmptyCopy(loading, recordId);

  return (
    <Card padding="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text fw={600} size="sm">
              Audit history
            </Text>
            <Text size="xs" c="dimmed">
              From GET /api/baptism-records/:id/history — parish-scoped via session church_id.
            </Text>
          </Stack>
          {recordId != null ? (
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              isDisabled={loading}
              onAction={() => void loadHistory()}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          ) : null}
        </Group>

        {error ? (
          <Alert color="red" title="History unavailable" role="alert">
            {error}
          </Alert>
        ) : null}

        {!error && !loading && entries.length === 0 ? (
          <Text size="sm" c="dimmed">
            {emptyCopy}
          </Text>
        ) : null}

        {loading && entries.length === 0 ? (
          <Text size="sm" c="dimmed">
            {emptyCopy}
          </Text>
        ) : null}

        {entries.length > 0 ? (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Event</Table.Th>
                <Table.Th>Actor</Table.Th>
                <Table.Th>Details</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text size="sm">{formatHistoryTimestamp(entry.timestamp)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm">
                      {formatHistoryTypeLabel(entry.type)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{entry.actor ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      {entry.description ? (
                        <Text size="sm">{entry.description}</Text>
                      ) : null}
                      {entry.changedFields.length > 0 ? (
                        <Text size="xs" c="dimmed">
                          Changed: {entry.changedFields.join(", ")}
                        </Text>
                      ) : null}
                      {entry.source ? (
                        <Text size="xs" c="dimmed">
                          Source: {entry.source}
                        </Text>
                      ) : null}
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : null}
      </Stack>
    </Card>
  );
}
