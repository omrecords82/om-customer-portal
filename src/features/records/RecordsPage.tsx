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
import { Button } from "@om/ui/button";
import { IconButton } from "@om/ui/icon-button";
import { LayoutGrid, List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { fetchSacramentalRecordsList } from "./recordsApi";
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
import {
  describeRecordsEditorGateStatus,
  resolveRecordsEditorFlags,
} from "./recordsEditorFlags";

const TYPE_FILTER = [
  { value: "all", label: "All types" },
  ...Object.entries(RECORD_TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

const STATUS_COLOR: Record<SacramentalRecord["status"], string> = {
  complete: "teal",
  "needs-review": "orange",
  draft: "gray",
};

const PAGE_SIZE = 25;

/**
 * Wave E chrome + Wave H gate prep — live records list/search only.
 * Deep links: preserve legacy `?type=` contract (+ aliases, recordId, churchId).
 * Editors / create / edit / delete deferred to Wave H.
 */
export function RecordsPage() {
  const { user } = useAuth();
  const editorFlags = useMemo(() => resolveRecordsEditorFlags(), []);
  const editorGateNote = useMemo(
    () => describeRecordsEditorGateStatus(editorFlags),
    [editorFlags],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = useMemo(
    () => parseRecordsDeepLink(searchParams),
    [searchParams],
  );

  const typeFilter = parsed.typeFilter;
  const liveEligible =
    authMode === "live" && user?.churchId != null && user.churchId > 0;

  const [records, setRecords] = useState<SacramentalRecord[]>([...MOCK_RECORDS]);
  const [listSource, setListSource] = useState<"mock" | "live" | "empty">("mock");
  const [listNote, setListNote] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(MOCK_RECORDS.length);

  const [query, setQuery] = useState(() => parsed.extras.q ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters change
    setPage(1);
  }, [typeFilter, debouncedQuery]);

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

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- records list bootstrap
    setListLoading(true);

    void fetchSacramentalRecordsList({
      churchId: user?.churchId ?? null,
      typeFilter,
      search: liveEligible ? debouncedQuery : "",
      page,
      limit: PAGE_SIZE,
    }).then((result) => {
      if (cancelled) return;
      setListLoading(false);

      if (!result.ok) {
        setRecords([]);
        setListSource("empty");
        setListNote(result.message);
        setTotalRecords(0);
        setTotalPages(1);
        return;
      }

      if (result.source === "mock") {
        setRecords([...result.records]);
        setListSource("mock");
        setListNote(
          "Preview mock data — live list uses GET /api/baptism-records, /api/marriage-records, and /api/funeral-records when AUTH_MODE=live with church context.",
        );
        setTotalRecords(MOCK_RECORDS.length);
        setTotalPages(1);
        return;
      }

      setRecords([...result.records]);
      setListSource("live");
      setTotalRecords(result.meta.totalRecords);
      setTotalPages(result.meta.totalPages);
      setListNote(
        result.note ??
          (result.records.length === 0
            ? "No records match the current filters."
            : null),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [liveEligible, user?.churchId, typeFilter, debouncedQuery, page]);

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

  const filtered = useMemo(() => {
    if (liveEligible) return records;
    return filterRecords(records, { query, type: typeFilter });
  }, [liveEligible, records, query, typeFilter]);

  const deepLinkNote =
    parsed.recordId != null
      ? ` · deep link recordId=${parsed.recordId}`
      : "";

  const countLabel = liveEligible
    ? `${String(totalRecords)} records${listLoading ? " · loading…" : ""}`
    : `${String(filtered.length)} records`;

  const sourceLabel =
    listSource === "live"
      ? "live parish data"
      : listSource === "mock"
        ? "mock data"
        : "no data";

  const showPagination =
    liveEligible &&
    typeFilter !== "all" &&
    totalPages > 1 &&
    listSource === "live";

  return (
    <PageLayout
      title="Records"
      description="View baptisms, marriages, chrismations, and other sacramental records. List and search are live when authenticated; sacramental editors are dual-run gated until Wave H ships."
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
          {`${countLabel} · ${sourceLabel}`}
          {deepLinkNote}
        </Text>
        <EditorGateNote note={editorGateNote} />
        {listNote ? (
          <Text size="sm" c="dimmed">
            {listNote}
          </Text>
        ) : null}

        {filtered.length === 0 && !listLoading ? (
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
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}

        {showPagination ? (
          <Group justify="space-between" wrap="wrap">
            <Text size="sm" c="dimmed">
              Page {String(page)} of {String(totalPages)}
            </Text>
            <Group gap="xs">
              <Button
                className="om-btn-ghost"
                variant="secondary"
                size="sm"
                isDisabled={page <= 1 || listLoading}
                onAction={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                className="om-btn-ghost"
                variant="secondary"
                size="sm"
                isDisabled={page >= totalPages || listLoading}
                onAction={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </Group>
          </Group>
        ) : null}
      </Stack>
    </PageLayout>
  );
}

function EditorGateNote({ note }: { readonly note: string }) {
  return (
    <Text size="sm" c="dimmed" role="note">
      {note}
    </Text>
  );
}
