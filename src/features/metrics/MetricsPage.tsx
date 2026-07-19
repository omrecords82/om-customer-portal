import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { PageLayout } from "../../components/PageLayout";

const METRICS = [
  { label: "Active members", value: "348", note: "Registered parishioners" },
  { label: "Baptisms YTD", value: "14", note: "Calendar year" },
  { label: "Marriages YTD", value: "6", note: "Calendar year" },
  { label: "Avg Sunday attendance", value: "162", note: "Trailing 8 weeks" },
] as const;

/**
 * Wave G — church metrics chrome. Chart libs stay app-owned later.
 */
export function MetricsPage() {
  return (
    <PageLayout
      title="Church Metrics"
      description="Membership trends, sacramental statistics, and parish growth over time."
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {METRICS.map((metric) => (
            <Card key={metric.label} padding="lg">
              <Text size="xs" tt="uppercase" fw={500} c="dimmed" mb="xs">
                {metric.label}
              </Text>
              <Title order={2} style={{ fontWeight: 400, fontSize: 32 }}>
                {metric.value}
              </Title>
              <Text size="xs" c="dimmed" mt={6}>
                {metric.note}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Charts
            </Title>
            <Text size="sm" c="dimmed">
              Chart rendering stays app-owned. This surface will host membership and sacramental
              series once metrics APIs are wired.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
