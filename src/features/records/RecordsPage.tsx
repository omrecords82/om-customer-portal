import {
  Badge,
  Card,
  Group,
  Select as MantineSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { AlertDialog } from "@om/ui/alert-dialog";
import { Button } from "@om/ui/button";
import { IconButton } from "@om/ui/icon-button";
import { LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { PageLayout } from "../../components/PageLayout";
import {
  MOCK_RECORDS,
  RECORD_TYPE_LABEL,
  filterRecords,
  type SacramentalRecord,
} from "./recordsData";
import {
  buildRecordsSearch,
  parseRecordsDeepLink,
  type RecordsTypeFilter,
} from "./recordsDeepLink";

const TYPE_FILTER = [
  { value: "all", label: "All types" },
  ...Object.entries(RECORD_TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

const STATUS_COLOR: Record<SacramentalRecord["status"], string> = {
  complete: "teal",
  "needs-review": "orange",
  draft: "gray",
};

/**
 * Wave E — records list chrome (search/filters/views). Editors are Wave H.
 * Deep links: preserve legacy `?type=` contract (+ aliases, recordId, churchId).
 */
export function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = useMemo(
    () => parseRecordsDeepLink(searchParams),
    [searchParams],
  );

  // URL is the source of truth for type filter (bookmarks / external links).
  const typeFilter = parsed.typeFilter;

  const [records, setRecords] = useState<SacramentalRecord[]>([...MOCK_RECORDS]);
  const [query, setQuery] = useState(() => parsed.extras.q ?? "");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Normalize alias types in the address bar (weddings → marriage) without dropping extras.
  useEffect(() => {
    const rawType = searchParams.get("type");
    if (!rawType) return;
    if (parsed.canonicalType && rawType.toLowerCase() !== parsed.canonicalType) {
      const next = buildRecordsSearch({
        typeFilter: parsed.typeFilter,
        recordId: parsed.recordId,
        churchId: parsed.churchId,
        extras: parsed.extras,
      });
      setSearchParams(next.startsWith("?") ? next.slice(1) : next, { replace: true });
    }
  }, [parsed, searchParams, setSearchParams]);

  function updateTypeFilter(next: string | null) {
    const type: RecordsTypeFilter =
      next === "baptism" ||
      next === "marriage" ||
      next === "funeral" ||
      next === "chrismation"
        ? next
        : "all";
    const qs = buildRecordsSearch({
      typeFilter: type,
      recordId: parsed.recordId,
      churchId: parsed.churchId,
      extras: {
        ...parsed.extras,
        ...(query.trim() ? { q: query.trim() } : {}),
      },
    });
    setSearchParams(qs.startsWith("?") ? qs.slice(1) : qs, { replace: true });
  }

  const filtered = useMemo(
    () =>
      filterRecords(records, {
        query,
        type: typeFilter,
      }),
    [records, query, typeFilter],
  );

  const pending = records.find((r) => r.id === pendingDeleteId) ?? null;
  const deepLinkNote =
    parsed.recordId != null
      ? ` · deep link recordId=${parsed.recordId}`
      : "";

  return (
    <PageLayout
      title="Records"
      description="View and manage baptisms, marriages, chrismations, and other sacramental records."
      action={
        <Button className="om-btn-primary" size="sm" accessibleLabel="Add record">
          <Plus size={14} aria-hidden />
          Add record
        </Button>
      }
    >
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" align="flex-end">
          <Group gap="sm" wrap="wrap" align="flex-end">
            <TextInput
              placeholder="Search people or clergy"
              aria-label="Search records"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              maw={280}
            />
            <MantineSelect
              aria-label="Filter by record type"
              data={TYPE_FILTER}
              value={typeFilter}
              onChange={updateTypeFilter}
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

        <Text size="sm" c="dimmed">
          {`${String(filtered.length)} records · mock data · editors deferred to Wave H`}
          {deepLinkNote}
        </Text>

        {filtered.length === 0 ? (
          <Text size="sm" c="dimmed">
            No records match the current filters.
          </Text>
        ) : null}

        {viewMode === "table" ? (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Person</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Clergy</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((record) => (
                <Table.Tr key={record.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {record.personName}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{RECORD_TYPE_LABEL[record.type]}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{record.date}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{record.clergy}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={STATUS_COLOR[record.status]}>
                      {record.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <IconButton
                      className="om-header-icon-btn"
                      variant="quiet"
                      accessibleLabel={`Delete ${record.personName}`}
                      icon={<Trash2 size={14} aria-hidden />}
                      onAction={() => setPendingDeleteId(record.id)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {filtered.map((record) => (
              <Card key={record.id} padding="md">
                <Stack gap="xs">
                  <Text fw={500}>{record.personName}</Text>
                  <Group gap="xs">
                    <Badge variant="light">{RECORD_TYPE_LABEL[record.type]}</Badge>
                    <Badge variant="outline" color={STATUS_COLOR[record.status]}>
                      {record.status}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {record.date} · {record.clergy}
                  </Text>
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    onAction={() => setPendingDeleteId(record.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}

        <AlertDialog
          title="Delete record?"
          description={
            pending
              ? `Remove “${pending.personName}” from the mock list? Editors are not yet available.`
              : "Remove this record?"
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          intent="destructive"
          isOpen={pendingDeleteId !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteId(null);
          }}
          onConfirm={() => {
            if (pendingDeleteId) {
              setRecords((prev) => prev.filter((r) => r.id !== pendingDeleteId));
            }
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      </Stack>
    </PageLayout>
  );
}
