import { Badge, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { MapPin } from "lucide-react";
import { useMemo } from "react";

import { PageLayout } from "../../components/PageLayout";
import {
  canShowCemeteryMap,
  resolveCemeteryFlags,
} from "./cemeteryFlags";

const PLOTS = [
  { id: "p1", section: "A", lot: "12", status: "occupied", name: "Kozlov family" },
  { id: "p2", section: "A", lot: "14", status: "available", name: "—" },
  { id: "p3", section: "B", lot: "3", status: "reserved", name: "Petrov" },
] as const;

/**
 * Wave G — cemetery list chrome. Map engine stays app-owned / deferred.
 * Flags default off; church overrides must come from config APIs (not hard-coded).
 */
export function CemeteryPage() {
  // No church-id hardcoding: overrides arrive later from parish config APIs.
  const flags = useMemo(() => resolveCemeteryFlags(), []);
  const showMap = canShowCemeteryMap(flags);

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

        <Card padding="lg">
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Plots
            </Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Section</Table.Th>
                  <Table.Th>Lot</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {PLOTS.map((plot) => (
                  <Table.Tr key={plot.id}>
                    <Table.Td>
                      <Text size="sm">{plot.section}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{plot.lot}</Text>
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
                ))}
              </Table.Tbody>
            </Table>
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
