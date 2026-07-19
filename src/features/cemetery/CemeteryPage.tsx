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
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  fetchCemeteryPlots,
  searchDeceasedPeople,
  type CemeteryPersonHit,
  type CemeteryPlotRow,
} from "./cemeteryApi";
import {
  canShowCemeteryMap,
  resolveCemeteryFlags,
} from "./cemeteryFlags";

/**
 * Wave G — cemetery read-oriented MVP chrome.
 * Map engine stays app-owned / deferred; no geometry editing.
 * Flags default off; church overrides must come from config APIs (not hard-coded).
 */
export function CemeteryPage() {
  const { user } = useAuth();
  // No church-id hardcoding: overrides arrive later from parish config APIs.
  const flags = useMemo(() => resolveCemeteryFlags(), []);
  const showMap = canShowCemeteryMap(flags);

  const [plots, setPlots] = useState<readonly CemeteryPlotRow[]>([]);
  const [plotsSource, setPlotsSource] = useState<"mock" | "live" | "empty">(
    "mock",
  );
  const [plotsNote, setPlotsNote] = useState<string | null>(null);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

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
              <Text size="sm" c="dimmed">
                Map shell ready for validated geometry (read-only MVP). Editing tools are excluded.
                Geometry loads via GET /api/churches/:churchId/cemetery/render-geometry when wired.
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                Map disabled until `cemetery.mapEnabled` is on and geometry is validated.
              </Text>
            )}
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              isDisabled={!showMap}
            >
              {showMap ? "Open map" : "Open map (disabled)"}
            </Button>
          </Stack>
        </Card>

        <Card padding="lg" maw={640}>
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
                          color={
                            plot.status === "occupied"
                              ? "navy"
                              : plot.status === "reserved"
                                ? "orange"
                                : "teal"
                          }
                        >
                          {plot.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        {selectedPlot ? (
          <Card padding="lg" maw={640}>
            <Stack gap="sm">
              <Title order={3} style={{ fontWeight: 500 }}>
                Plot detail
              </Title>
              <Text size="sm">
                Section {selectedPlot.section} · Lot {selectedPlot.lot}
                {selectedPlot.rowNo ? ` · Row ${selectedPlot.rowNo}` : ""}
              </Text>
              <Text size="sm">Occupants: {selectedPlot.name}</Text>
              <Badge
                variant="light"
                color={
                  selectedPlot.status === "occupied"
                    ? "navy"
                    : selectedPlot.status === "reserved"
                      ? "orange"
                      : "teal"
                }
                w="fit-content"
              >
                {selectedPlot.status}
              </Badge>
              <Text size="xs" c="dimmed">
                Full occupant history stays on GET
                /api/churches/:churchId/cemetery/plots/:plotId (next deepen).
              </Text>
            </Stack>
          </Card>
        ) : null}

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
