import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  fetchChurchMetrics,
  type MetricsSlice,
} from "./metricsApi";

/**
 * Wave G — church metrics chrome. Chart libs stay app-owned later.
 * Live KPIs from dashboard (+ charts/summary labels when flagged).
 */
export function MetricsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSlice | null>(null);
  const [source, setSource] = useState<"preview" | "live" | "empty">("preview");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- metrics bootstrap
    setLoading(true);
    void fetchChurchMetrics(user?.churchId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setMetrics(null);
        setSource("empty");
        setNote(result.message);
        return;
      }
      if (result.source === "preview") {
        setMetrics(null);
        setSource("preview");
        setNote(
          "Preview mode — no sample KPI values shown as live. Set AUTH_MODE=live with church context to load GET /api/churches/:churchId/dashboard.",
        );
        return;
      }
      setMetrics(result.metrics);
      setSource("live");
      if (result.partialErrors.length > 0) {
        setNote(result.partialErrors.join(" "));
      } else if (
        result.metrics.kpis.every((k) => k.value === "0") &&
        result.metrics.distribution.every((d) => d.value === "0")
      ) {
        setNote("No sacramental totals for this church yet.");
      } else {
        setNote(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.churchId]);

  return (
    <PageLayout
      title="Church Metrics"
      description="Membership trends, sacramental statistics, and parish growth over time."
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" role="status">
          {loading
            ? "Loading metrics…"
            : source === "live"
              ? "Live metrics"
              : source === "empty"
                ? "Unavailable"
                : "Preview"}
          {authMode === "live" && user?.churchId != null
            ? ` · church ${String(user.churchId)}`
            : null}
        </Text>

        {note ? (
          <Text size="sm" role="status">
            {note}
          </Text>
        ) : null}

        {metrics ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {metrics.kpis.map((metric) => (
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
        ) : (
          <Card padding="lg" maw={640}>
            <Text size="sm" c="dimmed">
              {source === "empty"
                ? "Metrics could not be loaded."
                : "KPI cards appear here once live dashboard data is available."}
            </Text>
          </Card>
        )}

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Distribution labels
            </Title>
            {metrics && metrics.distribution.length > 0 ? (
              <Stack gap={4}>
                {metrics.distribution.map((row) => (
                  <Text key={row.label} size="sm">
                    {row.label}: {row.value}
                  </Text>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Baptism / marriage / funeral counts will list here from live data.
              </Text>
            )}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Charts
            </Title>
            <Text size="sm" c="dimmed">
              Chart rendering stays app-owned. Series load via GET
              /api/churches/:churchId/charts/summary when OM Charts is enabled;
              this surface shows KPI cards and labels only.
            </Text>
            {metrics?.seriesNotes.map((line) => (
              <Text key={line} size="sm">
                {line}
              </Text>
            ))}
            {metrics?.chartsEnabled ? (
              <Text size="xs" c="dimmed">
                Charts summary responded; graphical series deferred.
              </Text>
            ) : null}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
