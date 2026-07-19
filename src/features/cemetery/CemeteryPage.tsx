import {
  Badge,
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  fetchCemeteryPlotDetail,
  fetchCemeteryPlots,
  fetchCemeteryRenderGeometry,
  searchDeceasedPeople,
  type CemeteryPersonHit,
  type CemeteryPlotDetail,
  type CemeteryPlotRow,
  type CemeteryRenderGeometry,
} from "./cemeteryApi";
import {
  canShowCemeteryMap,
  resolveCemeteryFlags,
} from "./cemeteryFlags";
import { CemeteryReadOnlyMap } from "./CemeteryReadOnlyMap";

/**
 * Wave G — cemetery read-oriented MVP chrome.
 * Map: read-only SVG shell when mapEnabled (full CemeteryMap engine deferred).
 * No geometry editing. Flags default off; no hard-coded church IDs.
 */
export function CemeteryPage() {
  const { user } = useAuth();
  const flags = useMemo(() => resolveCemeteryFlags(), []);
  const showMap = canShowCemeteryMap(flags);

  const [plots, setPlots] = useState<readonly CemeteryPlotRow[]>([]);
  const [plotsSource, setPlotsSource] = useState<"mock" | "live" | "empty">(
    "mock",
  );
  const [plotsNote, setPlotsNote] = useState<string | null>(null);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

  const [geometry, setGeometry] = useState<CemeteryRenderGeometry | null>(null);
  const [geometryNote, setGeometryNote] = useState<string | null>(null);
  const [geometryLoading, setGeometryLoading] = useState(false);

  const [detail, setDetail] = useState<CemeteryPlotDetail | null>(null);
  const [detailNote, setDetailNote] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHits, setSearchHits] = useState<readonly CemeteryPersonHit[]>(
    [],
  );
  const [searchNote, setSearchNote] = useState<string | null>(null);

  useEffect(() => {
    if (!flags.enabled) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- plots bootstrap
    setPlotsLoading(true);
    void fetchCemeteryPlots(user?.churchId).then((result) => {
      if (cancelled) return;
      setPlotsLoading(false);
      if (!result.ok) {
        setPlots([]);
        setPlotsSource("empty");
        setPlotsNote(result.message);
        return;
      }
      setPlots(result.plots);
      setPlotsSource(result.source);
      if (result.source === "live" && result.plots.length === 0) {
        setPlotsNote("No cemetery plots for this church yet.");
      } else if (result.source === "mock") {
        setPlotsNote(
          "Preview plot stub. Live list uses GET /api/churches/:churchId/cemetery/plots when AUTH_MODE=live and church context is present.",
        );
      } else {
        setPlotsNote(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [flags.enabled, user?.churchId]);

  useEffect(() => {
    if (!flags.enabled || !showMap) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- geometry bootstrap when mapEnabled
    setGeometryLoading(true);
    void fetchCemeteryRenderGeometry(user?.churchId).then((result) => {
      if (cancelled) return;
      setGeometryLoading(false);
      if (!result.ok) {
        setGeometry(null);
        setGeometryNote(result.message);
        return;
      }
      setGeometry(result.geometry);
      setGeometryNote(
        result.source === "mock"
          ? "Preview geometry stub (not a live parish map)."
          : null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [flags.enabled, showMap, user?.churchId]);

  useEffect(() => {
    if (!flags.enabled || selectedPlotId == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear detail when deselected
      setDetail(null);
      setDetailNote(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailNote(null);
    void fetchCemeteryPlotDetail(user?.churchId, selectedPlotId).then(
      (result) => {
        if (cancelled) return;
        setDetailLoading(false);
        if (!result.ok) {
          setDetail(null);
          setDetailNote(result.message);
          return;
        }
        setDetail(result.detail);
        if (result.source === "mock") {
          setDetailNote("Preview plot detail stub.");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [flags.enabled, selectedPlotId, user?.churchId]);

  const selectedPlot =
    selectedPlotId == null
      ? null
      : (plots.find((p) => p.id === selectedPlotId) ?? null);

  function runSearch() {
    setSearchLoading(true);
    setSearchNote(null);
    void searchDeceasedPeople(user?.churchId, searchQ).then((result) => {
      setSearchLoading(false);
      if (!result.ok) {
        setSearchHits([]);
        setSearchNote(result.message);
        return;
      }
      setSearchHits(result.people);
      if (result.people.length === 0) {
        setSearchNote(
          searchQ.trim()
            ? "No deceased persons matched that search."
            : "Enter a name or plot to search.",
        );
      } else if (result.source === "mock") {
        setSearchNote("Preview search over stub occupants.");
      } else {
        setSearchNote(null);
      }
    });
  }

  if (!flags.enabled) {
    return (
      <PageLayout
        title="Cemetery"
        description="Cemetery module is disabled for this church."
      >
        <Card padding="lg" maw={640}>
          <Stack gap="sm">
            <Text size="sm">
              Feature flags default off (`cemetery.enabled`). Operators enable per church after
              geometry and record mappings are validated.
            </Text>
            <Text size="sm" c="dimmed">
              Flags: map={String(flags.mapEnabled)} · maintenance=
              {String(flags.maintenanceEnabled)} · reports=
              {String(flags.reportsEnabled)}
            </Text>
          </Stack>
        </Card>
      </PageLayout>
    );
  }

  const statusColor = (status: string) =>
    status === "occupied"
      ? "navy"
      : status === "reserved"
        ? "orange"
        : "teal";

  return (
    <PageLayout
      title="Cemetery"
      description="Manage cemetery plots, burial records, and interment documentation."
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" role="status">
          {plotsLoading
            ? "Loading plots…"
            : plotsSource === "live"
              ? "Live cemetery"
              : plotsSource === "empty"
                ? "Unavailable"
                : "Preview"}
          {authMode === "live" && user?.churchId != null
            ? ` · church ${String(user.churchId)}`
            : null}
        </Text>

        <Card padding="lg">
          <Stack gap="sm" align="flex-start">
            <Group gap="sm">
              <MapPin size={18} aria-hidden />
              <Title order={3} style={{ fontWeight: 500 }}>
                Map
              </Title>
            </Group>
            {showMap ? (
              <Box w="100%">
                <CemeteryReadOnlyMap
                  plots={plots}
                  geometry={geometry}
                  selectedPlotId={selectedPlotId}
                  onSelectPlot={setSelectedPlotId}
                  loading={geometryLoading}
                  note={geometryNote}
                />
              </Box>
            ) : (
              <Text size="sm" c="dimmed">
                Map disabled until `cemetery.mapEnabled` is on and geometry is validated.
              </Text>
            )}
          </Stack>
        </Card>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Card padding="lg">
            <Stack gap="md">
              <Title order={3} style={{ fontWeight: 500 }}>
                Search deceased
              </Title>
              <TextField
                label="Name or plot"
                value={searchQ}
                onValueChange={setSearchQ}
                placeholder="Last name, first name, or grave number"
              />
              {searchNote ? (
                <Text size="sm" role="status">
                  {searchNote}
                </Text>
              ) : null}
              <Button
                className="om-btn-primary"
                size="sm"
                isDisabled={searchLoading}
                accessibleLabel="Search deceased persons"
                onAction={() => {
                  runSearch();
                }}
              >
                {searchLoading ? "Searching…" : "Search"}
              </Button>
              {searchHits.length > 0 ? (
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Section</Table.Th>
                      <Table.Th>Plot</Table.Th>
                      <Table.Th>Death</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {searchHits.map((hit) => (
                      <Table.Tr
                        key={hit.personId}
                        style={{ cursor: hit.plotId ? "pointer" : undefined }}
                        onClick={() => {
                          if (hit.plotId) setSelectedPlotId(hit.plotId);
                        }}
                      >
                        <Table.Td>
                          <Text size="sm">{hit.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{hit.sectionCode ?? "—"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{hit.plotNumber ?? "—"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{hit.deathDate ?? "—"}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : null}
            </Stack>
          </Card>

          <Card
            padding="lg"
            id="cemetery-plot-detail"
            style={{ scrollMarginTop: 72 }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Plot detail
                </Title>
                {selectedPlotId ? (
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    accessibleLabel="Clear plot selection"
                    onAction={() => {
                      setSelectedPlotId(null);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </Group>
              {!selectedPlot && !detailLoading ? (
                <Text size="sm" c="dimmed">
                  Select a plot from the map or list to see status and associated
                  interments.
                </Text>
              ) : null}
              {detailLoading ? (
                <Text size="sm" c="dimmed" role="status">
                  Loading plot detail…
                </Text>
              ) : null}
              {detailNote ? (
                <Text size="sm" role="status">
                  {detailNote}
                </Text>
              ) : null}
              {detail ? (
                <>
                  <Text size="sm">
                    {detail.sectionName ?? `Section ${detail.section}`} · Lot{" "}
                    {detail.lot}
                    {detail.rowNo ? ` · Row ${detail.rowNo}` : ""}
                  </Text>
                  {detail.familyCrest ? (
                    <Text size="sm">Family: {detail.familyCrest}</Text>
                  ) : null}
                  <Badge
                    variant="light"
                    color={statusColor(detail.status)}
                    w="fit-content"
                  >
                    {detail.status}
                  </Badge>
                  <Text size="xs" tt="uppercase" c="dimmed" fw={600}>
                    Associated records (interments)
                  </Text>
                  {detail.occupants.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      No interments recorded for this plot.
                    </Text>
                  ) : (
                    <Stack gap="xs">
                      {detail.occupants.map((o) => (
                        <Box
                          key={o.intermentId}
                          p="sm"
                          style={{
                            border:
                              "1px solid var(--mantine-color-gray-3)",
                            borderRadius: 8,
                          }}
                        >
                          <Text size="sm" fw={500}>
                            {o.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {[
                              o.birthDate || o.deathDate
                                ? `${o.birthDate ?? "?"} – ${o.deathDate ?? "?"}`
                                : null,
                              o.burialDate ? `Buried ${o.burialDate}` : null,
                              o.personId ? `Person #${o.personId}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  )}
                  {detail.notes ? (
                    <Text size="sm" c="dimmed">
                      Notes: {detail.notes}
                    </Text>
                  ) : null}
                </>
              ) : selectedPlot && !detailLoading ? (
                <>
                  <Text size="sm">
                    Section {selectedPlot.section} · Lot {selectedPlot.lot}
                    {selectedPlot.rowNo ? ` · Row ${selectedPlot.rowNo}` : ""}
                  </Text>
                  <Text size="sm">Occupants: {selectedPlot.name}</Text>
                  <Badge
                    variant="light"
                    color={statusColor(selectedPlot.status)}
                    w="fit-content"
                  >
                    {selectedPlot.status}
                  </Badge>
                </>
              ) : null}
            </Stack>
          </Card>
        </SimpleGrid>

        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3} style={{ fontWeight: 500 }}>
                Plots
              </Title>
              <Text size="sm" c="dimmed">
                {plotsLoading
                  ? "Loading…"
                  : plotsSource === "live"
                    ? "live"
                    : plotsSource === "empty"
                      ? "empty"
                      : "mock"}
              </Text>
            </Group>
            {plotsNote ? (
              <Text size="sm" role="status">
                {plotsNote}
              </Text>
            ) : null}
            <Box style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Section</Table.Th>
                    <Table.Th>Lot</Table.Th>
                    <Table.Th>Row</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {plots.length === 0 && !plotsLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text size="sm" c="dimmed">
                          No plots to show.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    plots.map((plot) => (
                      <Table.Tr
                        key={plot.id}
                        style={{
                          cursor: "pointer",
                          background:
                            selectedPlotId === plot.id
                              ? "var(--mantine-color-gray-0)"
                              : undefined,
                        }}
                        onClick={() => {
                          setSelectedPlotId(plot.id);
                          if (typeof document !== "undefined") {
                            document
                              .getElementById("cemetery-plot-detail")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                      >
                        <Table.Td>
                          <Text size="sm">{plot.section}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{plot.lot}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{plot.rowNo ?? "—"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{plot.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={statusColor(plot.status)}
                          >
                            {plot.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          </Stack>
        </Card>

        {flags.maintenanceEnabled ? (
          <Card padding="lg">
            <Text size="sm">Maintenance surface enabled for this church.</Text>
          </Card>
        ) : null}
        {flags.reportsEnabled ? (
          <Card padding="lg">
            <Text size="sm">Reports surface enabled for this church.</Text>
          </Card>
        ) : null}
      </Stack>
    </PageLayout>
  );
}
