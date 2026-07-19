import {
  Badge,
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Home,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  buildChartsDeferredNote,
  buildDistributionEmptyCopy,
  buildMetricsEmptyKpiCopy,
  buildMetricsStatusNote,
  formatMetricsCount,
  METRICS_SOURCE_MODULES,
  metricsEmptyNote,
  metricsSlice,
  metricsSourceBadgeLabel,
  type MetricsSourceModule,
} from "./metricsPresentation";
import { useMetricsDashboard } from "./useMetricsDashboard";

const KPI_ICONS = [TrendingUp, Users, FileText, PieChart] as const;

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof TrendingUp;
  loading: boolean;
}) {
  return (
    <Card aria-busy={loading}>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Text
          size="xs"
          tt="uppercase"
          fw={500}
          c="dimmed"
          style={{ letterSpacing: "0.08em" }}
        >
          {label}
        </Text>
        <Box
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: "var(--mantine-color-navy-0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--mantine-color-navy-6)",
            flexShrink: 0,
          }}
        >
          <Icon size={15} aria-hidden="true" />
        </Box>
      </Group>
      <Title
        order={2}
        style={{
          fontSize: 32,
          fontWeight: 400,
          lineHeight: 1,
          color: loading
            ? "var(--mantine-color-dimmed)"
            : "var(--mantine-color-text)",
        }}
        mb={6}
      >
        {value}
      </Title>
      <Text size="xs" c="dimmed">
        {note}
      </Text>
    </Card>
  );
}

function HonestEmptyPanel({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  icon: typeof BarChart3;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: 180,
      }}
      py="xl"
    >
      <Box
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: "var(--mantine-color-default-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--mantine-color-dimmed)",
          marginBottom: 14,
        }}
      >
        <Icon size={24} aria-hidden="true" />
      </Box>
      <Text fw={500} size="sm" mb={6}>
        {title}
      </Text>
      <Text size="xs" c="dimmed" style={{ maxWidth: 360 }} mb="md">
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button
          className="om-btn-ghost"
          variant="secondary"
          size="sm"
          accessibleLabel={actionLabel}
          onAction={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}

function SourceModuleCard({
  module,
  onOpen,
}: {
  module: MetricsSourceModule;
  onOpen: (href: string) => void;
}) {
  return (
    <Card padding="md" style={{ height: "100%" }}>
      <Text fw={500} size="sm" mb="xs">
        {module.label}
      </Text>
      <Text size="xs" c="dimmed" mb={6}>
        {module.description}
      </Text>
      <Text size="xs" c="dimmed" mb="md">
        {module.apiNote}
      </Text>
      <Button
        className="om-btn-ghost"
        variant="secondary"
        size="sm"
        accessibleLabel={`Open ${module.label}`}
        onAction={() => {
          onOpen(module.href);
        }}
      >
        Open
        <ArrowRight size={14} aria-hidden="true" />
      </Button>
    </Card>
  );
}

/**
 * Wave G — church metrics chrome. Chart libs stay app-owned later.
 * Live KPIs from shared hub dashboard API (+ charts/summary labels when flagged).
 */
export function MetricsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const churchId = user?.churchId;
  const liveSession = authMode === "live" && churchId != null;
  const metricsState = useMetricsDashboard(churchId);

  const loading = metricsState.status === "loading";
  const metrics = metricsSlice(metricsState);
  const emptyNote = metricsEmptyNote(metricsState);
  const session = { liveSession, churchId: churchId ?? null };
  const statusNote = buildMetricsStatusNote({ session, state: metricsState });
  const badgeLabel = metricsSourceBadgeLabel(metricsState, loading);
  const emptyKpi = buildMetricsEmptyKpiCopy({ state: metricsState, loading });

  const openModule = (href: string) => {
    void navigate(href);
  };

  const badgeColor =
    badgeLabel === "Live"
      ? "green"
      : badgeLabel === "Unavailable"
        ? "red"
        : badgeLabel === "Loading…"
          ? "gray"
          : "blue";

  return (
    <PageLayout
      title="Church Metrics"
      description="Membership trends, sacramental statistics, and parish growth over time."
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Text
            size="sm"
            c="dimmed"
            role="status"
            aria-live="polite"
            aria-busy={loading}
            style={{ flex: 1, minWidth: 200 }}
          >
            {statusNote}
            {liveSession ? ` · church ${String(churchId)}` : null}
          </Text>
          <Badge size="sm" variant="light" color={badgeColor}>
            {badgeLabel}
          </Badge>
        </Group>

        {emptyNote ? (
          <Text size="sm" role="status">
            {emptyNote}
          </Text>
        ) : null}

        {metrics && metrics.kpis.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {metrics.kpis.map((metric, index) => (
              <SummaryCard
                key={metric.label}
                label={metric.label}
                value={formatMetricsCount(metric.value, loading)}
                note={metric.note}
                icon={KPI_ICONS[index % KPI_ICONS.length] ?? TrendingUp}
                loading={loading}
              />
            ))}
          </SimpleGrid>
        ) : (
          <HonestEmptyPanel
            title={emptyKpi.title}
            description={emptyKpi.description}
            icon={BarChart3}
            actionLabel={
              metricsState.status === "error" ? "Open parish dashboard" : "Open records"
            }
            onAction={() => {
              void navigate(metricsState.status === "error" ? "/" : "/records");
            }}
          />
        )}

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Distribution labels
            </Title>
            {metrics && metrics.distribution.length > 0 ? (
              <Stack gap={4}>
                {metrics.distribution.map((row) => (
                  <Group key={row.label} justify="space-between" wrap="nowrap">
                    <Text size="sm">{row.label}</Text>
                    <Text size="sm" fw={500}>
                      {formatMetricsCount(row.value, loading)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                {buildDistributionEmptyCopy({ state: metricsState, loading })}
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
              {buildChartsDeferredNote(metrics?.chartsEnabled ?? false)}
            </Text>
            {metrics?.seriesNotes.map((line) => (
              <Text key={line} size="sm">
                {line}
              </Text>
            ))}
            {metrics?.chartsEnabled ? (
              <Text size="xs" c="dimmed">
                GET /api/churches/:churchId/charts/summary responded; graphical
                series deferred.
              </Text>
            ) : null}
          </Stack>
        </Card>

        <Stack gap="xs">
          <Text
            size="xs"
            tt="uppercase"
            fw={500}
            c="dimmed"
            style={{ letterSpacing: "0.08em" }}
          >
            Related modules
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            {METRICS_SOURCE_MODULES.map((module) => (
              <SourceModuleCard
                key={module.href}
                module={module}
                onOpen={openModule}
              />
            ))}
          </SimpleGrid>
        </Stack>

        <Card padding="md">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="xs">
              <Home size={16} aria-hidden="true" />
              <Text size="sm" c="dimmed">
                Same dashboard API as the parish hub — no invented sample KPIs.
              </Text>
            </Group>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Open help and site map"
              onAction={() => {
                void navigate("/help");
              }}
            >
              Help & site map
            </Button>
          </Group>
        </Card>
      </Stack>
    </PageLayout>
  );
}
