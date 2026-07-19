import { Box, Card, SimpleGrid, Stack, Text, Title, Group, Divider } from "@mantine/core";
import { Button } from "@om/ui/button";
import {
  Plus,
  Users,
  FileText,
  Award,
  Clock,
  UserPlus,
  Upload,
  FileBadge,
  CalendarX,
} from "lucide-react";
import { PageLayout } from "../components/PageLayout";

// ─── Mock activity data ───────────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  {
    id: 1,
    icon: UserPlus,
    label: "New member registered",
    detail: "Alexandra Kozlov",
    time: "2 hours ago",
  },
  {
    id: 2,
    icon: FileText,
    label: "Baptismal record added",
    detail: "Michael Petrov",
    time: "Yesterday at 3:14 pm",
  },
  {
    id: 3,
    icon: Upload,
    label: "OCR upload processed",
    detail: "12 pages — registry scan",
    time: "2 days ago",
  },
  {
    id: 4,
    icon: FileBadge,
    label: "Certificate of marriage issued",
    detail: "George & Maria Ivanova",
    time: "3 days ago",
  },
  {
    id: 5,
    icon: FileText,
    label: "Chrismation record updated",
    detail: "Natalia Sokolova",
    time: "4 days ago",
  },
];

// ─── Summary card ─────────────────────────────────────────────────────────────

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

// ─── Recent activity panel ────────────────────────────────────────────────────

function RecentActivityPanel() {
  return (
    <Card style={{ height: "100%" }}>
      <Group justify="space-between" mb="md" align="center">
        <Text fw={500} size="sm">
          Recent Activity
        </Text>
        <Group gap={4} align="center">
          <Clock size={13} color="var(--mantine-color-dimmed)" aria-hidden="true" />
          <Text size="xs" c="dimmed">
            Last 7 days
          </Text>
        </Group>
      </Group>

      <Stack gap={0}>
        {RECENT_ACTIVITY.map((item, i) => {
          const Icon = item.icon;
          return (
            <Box key={item.id}>
              <Group py="sm" gap="sm" wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    background: "var(--mantine-color-default-hover)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--mantine-color-dimmed)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Icon size={14} aria-hidden="true" />
                </Box>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" style={{ lineHeight: 1.35 }}>
                    {item.label}
                  </Text>
                  <Text size="xs" c="dimmed" mt={1}>
                    {item.detail}
                  </Text>
                </Box>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  {item.time}
                </Text>
              </Group>
              {i < RECENT_ACTIVITY.length - 1 && <Divider />}
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}

// ─── Empty state panel ────────────────────────────────────────────────────────

function EmptyStatePanel() {
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
        <CalendarX size={24} aria-hidden="true" />
      </Box>
      <Text fw={500} size="sm" mb={6}>
        No upcoming events
      </Text>
      <Text size="xs" c="dimmed" style={{ maxWidth: 240 }} mb="md">
        Add events to the parish calendar to see them here.
      </Text>
      <Button
        className="om-btn-ghost"
        variant="secondary"
        size="sm"
        accessibleLabel="Go to parish calendar"
      >
        Open Calendar
      </Button>
    </Card>
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

export function HomePage() {
  const primaryAction = (
    <Button
      className="om-btn-primary"
      variant="primary"
      size="sm"
      accessibleLabel="Add a new record"
    >
      <Plus size={14} aria-hidden="true" />
      New Record
    </Button>
  );

  return (
    <PageLayout
      title="Parish Dashboard"
      description="Welcome to the Saints Peter and Paul Orthodox Church portal."
      action={primaryAction}
    >
      <Stack gap="lg">
        {/* Summary cards */}
        <SimpleGrid
          cols={{ base: 1, sm: 2, lg: 3 }}
          spacing="sm"
        >
          <SummaryCard
            label="Active Members"
            value="348"
            note="Registered parishioners"
            icon={Users}
          />
          <SummaryCard
            label="Records This Month"
            value="12"
            note="Baptisms, marriages, chrismations"
            icon={FileText}
          />
          <SummaryCard
            label="Certificates Issued"
            value="7"
            note="Year to date"
            icon={Award}
          />
        </SimpleGrid>

        {/* Activity + empty state */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <RecentActivityPanel />
          <EmptyStatePanel />
        </SimpleGrid>
      </Stack>
    </PageLayout>
  );
}
