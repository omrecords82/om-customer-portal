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

/**
 * Hub honesty (Wave D): do not show fake KPI/activity as if live.
 * Live dashboard APIs are not wired yet — render honest empty / preview states.
 */

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

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const liveSession = authMode === "live" && user?.churchId != null;
  const welcomeLine = liveSession
    ? `Signed in as ${user.displayName}. Hub KPIs stay empty until live dashboard APIs connect.`
    : "Welcome to the Customer Portal preview. Summary and activity stay empty (not sample data).";

  const primaryAction = (
    <Button
      className="om-btn-primary"
      variant="primary"
      size="sm"
      accessibleLabel="Add a new record"
      onAction={() => {
        void navigate("/records");
      }}
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
          {liveSession
            ? "Dashboard KPIs and activity feed wait on live hub APIs — showing honest empty states (not sample data)."
            : "Preview mode — summary and activity are empty until live auth and hub APIs are enabled."}
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
            label="Active Members"
            value="—"
            note="Membership counts when hub APIs connect"
            icon={Users}
          />
          <SummaryCard
            label="Records This Month"
            value="—"
            note="Sacramental totals when records APIs connect"
            icon={FileText}
          />
          <SummaryCard
            label="Certificates Issued"
            value="—"
            note="Certificate history when cert APIs connect"
            icon={Award}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <HonestEmptyPanel
            title="No recent activity yet"
            description="Parish activity will appear here once live hub events are wired. Quick actions above still work."
            icon={Clock}
            actionLabel="Open records"
            onAction={() => {
              void navigate("/records");
            }}
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
