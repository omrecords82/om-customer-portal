import { Box, Progress, Stack, Text, Title, Group, ThemeIcon } from "@mantine/core";
import { useComputedColorScheme } from "@mantine/core";
import { Church, CheckCircle2, Loader2, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "../../components/PageLayout";

type StepStatus = "completed" | "processing" | "pending";

type OnboardStep = {
  readonly id: string;
  readonly label: string;
  readonly status: StepStatus;
};

const STORAGE_KEY = "om_portal2_onboard_progress";

const INITIAL_STEPS: readonly OnboardStep[] = [
  { id: "profile", label: "Preparing Church Profile", status: "completed" },
  { id: "storage", label: "Provisioning Database & Storage", status: "processing" },
  { id: "users", label: "Configuring Users, Roles & Permissions", status: "pending" },
  { id: "branding", label: "Applying Branding & Portal Template", status: "pending" },
  { id: "records", label: "Importing Records & Enabling Certificates", status: "pending" },
  { id: "validation", label: "Running Final Validation", status: "pending" },
];

function readPersistedCursor(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cursor?: unknown };
    return typeof parsed.cursor === "number" ? parsed.cursor : null;
  } catch {
    return null;
  }
}

function writePersistedCursor(cursor: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ cursor, savedAt: Date.now() }));
}

function stepsFromCursor(cursor: number): OnboardStep[] {
  return INITIAL_STEPS.map((step, index) => {
    if (index < cursor) return { ...step, status: "completed" as const };
    if (index === cursor && cursor < INITIAL_STEPS.length) {
      return { ...step, status: "processing" as const };
    }
    if (cursor >= INITIAL_STEPS.length) {
      return { ...step, status: "completed" as const };
    }
    return { ...step, status: "pending" as const };
  });
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return <CheckCircle2 size={22} color="var(--mantine-color-teal-6)" aria-hidden />;
  }
  if (status === "processing") {
    return <Loader2 size={22} color="var(--mantine-color-gold-6)" className="om-spin" aria-hidden />;
  }
  return <Circle size={22} color="var(--mantine-color-dimmed)" aria-hidden />;
}

/**
 * Productized OM Onboard blueprint (Mantine + token-aware chrome).
 * Progress persists locally until parish onboarding APIs are wired.
 */
export function OnboardPage() {
  const colorScheme = useComputedColorScheme("light");
  const [steps, setSteps] = useState<OnboardStep[]>(() => {
    const saved = readPersistedCursor();
    return saved == null ? [...INITIAL_STEPS] : stepsFromCursor(saved);
  });

  useEffect(() => {
    const saved = readPersistedCursor();
    if (saved != null && saved >= INITIAL_STEPS.length) {
      return;
    }
    let cursor = saved == null ? 1 : Math.max(saved, 1);
    const timer = window.setInterval(() => {
      cursor += 1;
      writePersistedCursor(cursor);
      if (cursor >= INITIAL_STEPS.length) {
        window.clearInterval(timer);
        setSteps(stepsFromCursor(cursor));
        return;
      }
      setSteps(stepsFromCursor(cursor));
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const processingIndex = steps.findIndex((s) => s.status === "processing");
  const stepLabel =
    processingIndex >= 0
      ? `Step ${String(processingIndex + 1)} of ${String(steps.length)}`
      : `Step ${String(steps.length)} of ${String(steps.length)}`;
  const progress = useMemo(
    () => Math.round((completedCount / steps.length) * 100),
    [completedCount, steps.length],
  );

  const cardBg =
    colorScheme === "dark" ? "var(--mantine-color-dark-6)" : "var(--mantine-color-body)";

  return (
    <PageLayout
      title="Portal Onboarding"
      description="Church portal preparation and provisioning status."
    >
      <Box
        maw={560}
        mx="auto"
        p="xl"
        style={{
          background: cardBg,
          borderRadius: 12,
          border: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Stack gap="lg" align="center">
          <ThemeIcon size={56} radius="md" variant="light" color="navy">
            <Church size={28} aria-hidden />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Title order={2} style={{ fontWeight: 500, textAlign: "center" }}>
              Preparing Your Church Portal
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              {stepLabel} · progress saved on this device until live APIs ship
            </Text>
          </Stack>
          <Progress value={progress} w="100%" color="navy" size="sm" radius="xl" />
          <Stack gap="sm" w="100%" role="list" aria-label="Onboarding steps">
            {steps.map((step) => (
              <Group key={step.id} gap="sm" wrap="nowrap" role="listitem">
                <StepIcon status={step.status} />
                <Text
                  size="sm"
                  fw={step.status === "processing" ? 600 : 400}
                  {...(step.status === "pending" ? { c: "dimmed" as const } : {})}
                >
                  {step.label}
                </Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Box>
    </PageLayout>
  );
}
