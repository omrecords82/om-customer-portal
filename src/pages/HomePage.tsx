import { Box, Card, SimpleGrid, Stack, Text, Title, Group } from "@mantine/core";
import { Button } from "@om/ui/button";
import {
  Plus,
  Users,
  FileText,
  Award,
  Clock,
  Upload,
  CalendarX,
} from "lucide-react";
import { useNavigate } from "react-router";
import { PageLayout } from "../components/PageLayout";
import { useAuth } from "../auth/AuthProvider";
import { authMode } from "../auth/config";
import { useHubDashboard } from "../features/hub/useHubDashboard";
import type { HubActivityItem } from "../features/hub/hubApi";

/**
 * Hub honesty (Wave D): show live KPIs/activity when AUTH_MODE=live + churchId;
 * otherwise honest empty / preview states — never invent sample data.
 */

function formatCount(value: number | null | undefined, loading: boolean): string {
  if (loading) return "…";
  if (value == null) return "—";
  return value.toLocaleString();
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
}) {
  return (
    <Card>
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
          color: "var(--mantine-color-text)",
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
      <Card style={{ minHeight: 220 }} py="xl">
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
        description={
          liveSession
            ? "No recent sacramental records returned for this parish."
            : "Parish activity will appear here once live hub events are wired. Quick actions above still work."
        }
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

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const liveSession = authMode === "live" && user?.churchId != null;
  const hub = useHubDashboard(user?.churchId);

  const loading = hub.status === "loading";
  const errored = hub.status === "error";
  const dashboard = hub.status === "ready" ? hub.dashboard : null;
  const certificatesIssued =
    hub.status === "ready" ? hub.certificatesIssued : null;
  const activity = hub.status === "ready" ? hub.activity : [];
  const partialErrors =
    hub.status === "ready" ? hub.partialErrors : ([] as readonly string[]);
  const dashFailed =
    errored ||
    (hub.status === "ready" && hub.source === "live" && dashboard == null);
  const certFailed =
    errored ||
    (hub.status === "ready" &&
      hub.source === "live" &&
      certificatesIssued == null &&
      partialErrors.some((e) => /certificate/i.test(e)));

  const welcomeLine = liveSession
    ? `Signed in as ${user.displayName}.`
    : "Welcome to the Customer Portal preview. Summary and activity stay empty (not sample data).";

  const statusNote = (() => {
    if (!liveSession) {
      return "Preview mode — summary and activity are empty until live auth and hub APIs are enabled.";
    }
    if (loading) {
      return "Loading parish dashboard from live hub APIs…";
    }
    if (errored) {
      return `Hub data unavailable — ${hub.message} Showing honest empty states.`;
    }
    if (partialErrors.length > 0) {
      return `Some hub widgets failed (${partialErrors.join(" ")}). Available data shown; failed tiles stay empty.`;
    }
    if (hub.status === "ready" && hub.source === "live") {
      return "Live hub data from church dashboard and certificate history.";
    }
    return "Dashboard KPIs and activity feed wait on live hub APIs — showing honest empty states (not sample data).";
  })();

  const openRecords = () => {
    void navigate("/records");
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
        <Text size="sm" c="dimmed" role="status">
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
            value={formatCount(dashboard?.totalRecords, loading)}
            note={
              dashFailed
                ? "Dashboard API unavailable"
                : liveSession && dashboard
                  ? `${dashboard.baptisms.toLocaleString()} baptisms · ${dashboard.marriages.toLocaleString()} marriages · ${dashboard.funerals.toLocaleString()} funerals`
                  : "Membership counts when hub APIs connect"
            }
            icon={Users}
          />
          <SummaryCard
            label="Records This Month"
            value={formatCount(dashboard?.recordsThisMonth, loading)}
            note={
              dashFailed
                ? "Dashboard API unavailable"
                : liveSession && dashboard
                  ? "From church dashboard monthly activity"
                  : "Sacramental totals when records APIs connect"
            }
            icon={FileText}
          />
          <SummaryCard
            label="Certificates Issued"
            value={formatCount(certificatesIssued, loading)}
            note={
              certFailed
                ? "Certificate history unavailable"
                : liveSession && certificatesIssued != null
                  ? "From certificate generation history"
                  : "Certificate history when cert APIs connect"
            }
            icon={Award}
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
          />
        </SimpleGrid>
      </Stack>
    </PageLayout>
  );
}
