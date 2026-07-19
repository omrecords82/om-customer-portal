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

const INITIAL_STEPS: readonly OnboardStep[] = [
  { id: "profile", label: "Preparing Church Profile", status: "completed" },
  { id: "storage", label: "Provisioning Database & Storage", status: "processing" },
  { id: "users", label: "Configuring Users, Roles & Permissions", status: "pending" },
  { id: "branding", label: "Applying Branding & Portal Template", status: "pending" },
  { id: "records", label: "Importing Records & Enabling Certificates", status: "pending" },
  { id: "validation", label: "Running Final Validation", status: "pending" },
];

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
 * Source UX: /blueprints/om-onboard
 */
export function OnboardPage() {
  const colorScheme = useComputedColorScheme("light");
  const [steps, setSteps] = useState<OnboardStep[]>(() => [...INITIAL_STEPS]);

  useEffect(() => {
    const order = INITIAL_STEPS.map((s) => s.id);
    let cursor = 1;
    const timer = window.setInterval(() => {
      cursor += 1;
      if (cursor >= order.length) {
        window.clearInterval(timer);
        setSteps((prev) =>
          prev.map((step) => ({ ...step, status: "completed" as const })),
        );
        return;
      }
      setSteps((prev) =>
        prev.map((step, index) => {
          if (index < cursor) return { ...step, status: "completed" };
          if (index === cursor) return { ...step, status: "processing" };
          return { ...step, status: "pending" };
        }),
      );
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
      description="Orthodox Metrics is preparing your church portal workspace."
    >
      <Box
        maw={640}
        mx="auto"
        p={{ base: "lg", sm: "xl" }}
        style={{
          background: cardBg,
          border: "1px solid var(--om-semantic-border-decorative, var(--mantine-color-default-border))",
          borderRadius: "var(--mantine-radius-md)",
          boxShadow: "var(--mantine-shadow-md)",
        }}
      >
        <Group justify="space-between" mb="xs">
          <Text size="xs" c="dimmed">
            {stepLabel}
          </Text>
          <Text size="xs" c="dimmed">
            {progress < 100 ? "~3 minutes remaining" : "Setup complete"}
          </Text>
        </Group>
        <Progress value={progress} mb="xl" color="gold" size="sm" radius="xl" aria-label="Onboarding progress" />

        <Stack align="center" gap="md" mb="xl">
          <ThemeIcon
            size={88}
            radius="xl"
            variant="light"
            color="navy"
            aria-hidden
          >
            <Church size={40} strokeWidth={1.5} />
          </ThemeIcon>
          <Title order={2} ta="center" style={{ fontWeight: 500 }}>
            {progress < 100
              ? "We're preparing your church portal…"
              : "Your church portal is ready"}
          </Title>
          <Text c="dimmed" ta="center" maw={480}>
            Orthodox Metrics is setting up your church profile, records workspace, users,
            permissions, branding, and certificate tools.
            {progress < 100
              ? " You'll be notified when setup is complete."
              : " You can continue to the parish dashboard."}
          </Text>
        </Stack>

        <Stack gap="md" role="list" aria-label="Onboarding steps">
          {steps.map((step) => (
            <Group key={step.id} gap="md" wrap="nowrap" role="listitem" align="flex-start">
              <Box pt={2} aria-hidden>
                <StepIcon status={step.status} />
              </Box>
              <Text
                style={{
                  color:
                    step.status === "processing"
                      ? "var(--mantine-color-text)"
                      : "var(--mantine-color-dimmed)",
                  fontWeight: step.status === "processing" ? 500 : 400,
                }}
              >
                {step.label}
                {step.status === "processing" ? (
                  <Text span size="sm" c="dimmed">
                    {" "}
                    (in progress)
                  </Text>
                ) : null}
              </Text>
            </Group>
          ))}
        </Stack>
      </Box>
    </PageLayout>
  );
}
