import { Badge, Box, Card, SimpleGrid, Stack, Text, Title, Group } from "@mantine/core";
import { Button } from "@om/ui/button";
import {
  Plus,
  Users,
  FileText,
  Award,
  Clock,
  Upload,
  CalendarX,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { PageLayout } from "../components/PageLayout";
import { useAuth } from "../auth/AuthProvider";
import { authMode } from "../auth/config";
import { resolveCemeteryFlags } from "../features/cemetery/cemeteryFlags";
import { useHubDashboard } from "../features/hub/useHubDashboard";
import type { HubActivityItem } from "../features/hub/hubApi";
import {
  buildActivityEmptyDescription,
  buildCertificatesNote,
  buildHubSecondaryModules,
  buildHubStatusNote,
  buildHubWelcomeLine,
  buildRecordsThisMonthNote,
  buildSacramentalRecordsNote,
  certificateCountUnavailable,
  dashboardUnavailable,
  formatHubCount,
  hubActivityItems,
  hubCertificatesIssued,
  hubDashboardSlice,
  type HubSecondaryModule,
} from "../features/hub/hubPresentation";

/**
 * Hub honesty (Wave D): show live KPIs/activity when AUTH_MODE=live + churchId;
 * otherwise honest empty / preview states — never invent sample data.
 */

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
  icon: typeof Users;
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
          color: loading ? "var(--mantine-color-dimmed)" : "var(--mantine-color-text)",
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
  icon: typeof Clock;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: 220,
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
      <Text size="xs" c="dimmed" style={{ maxWidth: 280 }} mb="md">
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

const TYPE_LABELS: Record<HubActivityItem["type"], string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  funeral: "Funeral",
};

function ActivityFeedCard({
  items,
  loading,
  liveSession,
  errored,
  onOpenRecords,
}: {
  items: readonly HubActivityItem[];
  loading: boolean;
  liveSession: boolean;
  errored: boolean;
  onOpenRecords: () => void;
}) {
  if (loading) {
    return (
      <Card style={{ minHeight: 220 }} py="xl" aria-busy="true">
        <Text size="sm" c="dimmed" ta="center">
          Loading recent activity…
        </Text>
      </Card>
    );
  }

  if (errored) {
    return (
      <HonestEmptyPanel
        title="Activity unavailable"
        description="Could not load recent parish activity. Records and quick actions still work."
        icon={Clock}
        actionLabel="Open records"
        onAction={onOpenRecords}
      />
    );
  }

  if (items.length === 0) {
    return (
      <HonestEmptyPanel
        title="No recent activity yet"
        description={buildActivityEmptyDescription(liveSession)}
        icon={Clock}
        actionLabel="Open records"
        onAction={onOpenRecords}
      />
    );
  }

  return (
    <Card style={{ minHeight: 220 }} p="md">
      <Text
        size="xs"
        tt="uppercase"
        fw={500}
        c="dimmed"
        mb="sm"
        style={{ letterSpacing: "0.08em" }}
      >
        Recent activity
      </Text>
      <Stack gap={0}>
        {items.slice(0, 8).map((item, index) => (
          <Group
            key={`${item.type}-${item.date}-${item.name}-${String(index)}`}
            justify="space-between"
            wrap="nowrap"
            py="sm"
            style={{
              borderTop:
                index === 0
                  ? undefined
                  : "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" fw={500} truncate>
                {item.name}
              </Text>
              <Text size="xs" c="dimmed">
                {TYPE_LABELS[item.type]}
              </Text>
            </Box>
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {item.date || "—"}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

const AVAILABILITY_LABELS: Record<
  HubSecondaryModule["availability"],
  string
> = {
  ready: "Available",
  preview: "Preview",
  disabled: "Not enabled",
};

function ModuleLinkCard({
  module,
  onOpen,
}: {
  module: HubSecondaryModule;
  onOpen: (href: string) => void;
}) {
  const disabled = module.availability === "disabled";

  return (
    <Card padding="md" style={{ height: "100%" }}>
      <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap">
        <Text fw={500} size="sm">
          {module.label}
        </Text>
        <Badge
          size="xs"
          variant="light"
          color={
            module.availability === "ready"
              ? "green"
              : module.availability === "preview"
                ? "blue"
                : "gray"
          }
        >
          {AVAILABILITY_LABELS[module.availability]}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed" mb={6}>
        {module.description}
      </Text>
      <Text size="xs" c="dimmed" mb="md">
        {module.availabilityNote}
      </Text>
      <Button
        className="om-btn-ghost"
        variant="secondary"
        size="sm"
        isDisabled={disabled}
        accessibleLabel={`Open ${module.label}`}
        onAction={() => {
          if (!disabled) onOpen(module.href);
        }}
      >
        {disabled ? "Not enabled" : "Open"}
        {!disabled ? <ArrowRight size={14} aria-hidden="true" /> : null}
      </Button>
    </Card>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const liveSession = authMode === "live" && user?.churchId != null;
  const hub = useHubDashboard(user?.churchId);
  const cemeteryEnabled = resolveCemeteryFlags().enabled;

  const loading = hub.status === "loading";
  const dashboard = hubDashboardSlice(hub);
  const certificatesIssued = hubCertificatesIssued(hub);
  const activity = hubActivityItems(hub);
  const dashFailed = dashboardUnavailable(hub, loading);
  const certFailed = certificateCountUnavailable(hub, loading);

  const session = { liveSession, displayName: user?.displayName ?? null };
  const welcomeLine = buildHubWelcomeLine(session);
  const statusNote = buildHubStatusNote({ session, hub });
  const secondaryModules = buildHubSecondaryModules({ cemeteryEnabled });

  const openRecords = () => {
    void navigate("/records");
  };

  const openModule = (href: string) => {
    void navigate(href);
  };

  const primaryAction = (
    <Button
      className="om-btn-primary"
      variant="primary"
      size="sm"
      accessibleLabel="Add a new record"
      onAction={openRecords}
    >
      <Plus size={14} aria-hidden="true" />
      New Record
    </Button>
  );

  return (
    <PageLayout
      title="Parish Dashboard"
      description={welcomeLine}
      action={primaryAction}
    >
      <Stack gap="lg">
        <Text
          size="sm"
          c="dimmed"
          role="status"
          aria-live="polite"
          aria-busy={loading}
        >
          {statusNote}
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Button
            className="om-btn-ghost"
            variant="secondary"
            onAction={() => {
              void navigate("/ocr");
            }}
          >
            <Upload size={14} aria-hidden="true" />
            Start OCR batch
          </Button>
          <Button
            className="om-btn-ghost"
            variant="secondary"
            onAction={() => {
              void navigate("/onboarding");
            }}
          >
            Continue onboarding
          </Button>
          <Button
            className="om-btn-ghost"
            variant="secondary"
            onAction={() => {
              void navigate("/settings/parish");
            }}
          >
            Parish settings
          </Button>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          <SummaryCard
            label="Sacramental Records"
            value={formatHubCount(dashboard?.totalRecords, loading)}
            note={buildSacramentalRecordsNote({
              session,
              dashboard,
              dashFailed,
            })}
            icon={Users}
            loading={loading}
          />
          <SummaryCard
            label="Records This Month"
            value={formatHubCount(dashboard?.recordsThisMonth, loading)}
            note={buildRecordsThisMonthNote({
              session,
              dashboard,
              dashFailed,
            })}
            icon={FileText}
            loading={loading}
          />
          <SummaryCard
            label="Certificates Issued"
            value={formatHubCount(certificatesIssued, loading)}
            note={buildCertificatesNote({
              session,
              certificatesIssued,
              certFailed,
            })}
            icon={Award}
            loading={loading}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <ActivityFeedCard
            items={activity}
            loading={loading}
            liveSession={liveSession}
            errored={dashFailed && !loading}
            onOpenRecords={openRecords}
          />
          <HonestEmptyPanel
            title="No upcoming events"
            description="Liturgical calendar is post-MVP. This panel stays empty rather than inventing sample events."
            icon={CalendarX}
            actionLabel="View help & site map"
            onAction={() => {
              void navigate("/help");
            }}
          />
        </SimpleGrid>

        <Stack gap="xs">
          <Text
            size="xs"
            tt="uppercase"
            fw={500}
            c="dimmed"
            style={{ letterSpacing: "0.08em" }}
          >
            Parish modules
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {secondaryModules.map((module) => (
              <ModuleLinkCard
                key={module.href}
                module={module}
                onOpen={openModule}
              />
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </PageLayout>
  );
}
