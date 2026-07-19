import { Badge, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { MapPin } from "lucide-react";

import { PageLayout } from "../../components/PageLayout";

const PLOTS = [
  { id: "p1", section: "A", lot: "12", status: "occupied", name: "Kozlov family" },
  { id: "p2", section: "A", lot: "14", status: "available", name: "—" },
  { id: "p3", section: "B", lot: "3", status: "reserved", name: "Petrov" },
] as const;

/**
 * Wave G — cemetery list chrome. Map engine stays app-owned / deferred.
 */
export function CemeteryPage() {
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
            <Text size="sm" c="dimmed">
              Interactive map hosting is app-owned and deferred. List chrome below is ready for
              plot APIs.
            </Text>
            <Button className="om-btn-ghost" variant="secondary" size="sm" isDisabled>
              Open map (coming soon)
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
      </Stack>
    </PageLayout>
  );
}
