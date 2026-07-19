import {
  Alert,
  Box,
  Progress,
  Stack,
  Text,
  Title,
  Group,
  ThemeIcon,
} from "@mantine/core";
import { useComputedColorScheme } from "@mantine/core";
import { AlertCircle, Church, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { authMode } from "../../auth/config";
import {
  fetchOnboardProgress,
  PROVISIONING_STEP_DEFS,
  readPersistedCursor,
  stepsFromCursor,
  writePersistedCursor,
  type OnboardStep,
  type OnboardStepStatus,
} from "./onboardApi";

const LIVE_POLL_MS = 8_000;

function StepIcon({ status }: { status: OnboardStepStatus }) {
  if (status === "completed") {
    return <CheckCircle2 size={22} color="var(--mantine-color-teal-6)" aria-hidden />;
  }
  if (status === "processing") {
    return <Loader2 size={22} color="var(--mantine-color-gold-6)" className="om-spin" aria-hidden />;
  }
  if (status === "failed") {
    return <XCircle size={22} color="var(--mantine-color-red-6)" aria-hidden />;
  }
  if (status === "blocked") {
    return <AlertCircle size={22} color="var(--mantine-color-orange-6)" aria-hidden />;
  }
  return <Circle size={22} color="var(--mantine-color-dimmed)" aria-hidden />;
}

function progressNote(
  source: "preview" | "live",
  checklistLive: boolean,
  loading: boolean,
): string {
  if (loading) return "Loading onboarding progress…";
  if (source === "preview") {
    return "Preview mode — progress saved on this device until live APIs ship";
  }
  if (checklistLive) return "Live provisioning checklist from Orthodox Metrics";
  return "Live enrollment status — detailed checklist pending server update";
}

/**
 * Productized OM Onboard blueprint (Mantine + token-aware chrome).
 * Live mode reads `/api/onboarding/provisioning-checklist` + `/api/onboarding/me`.
 */
export function OnboardPage() {
  const colorScheme = useComputedColorScheme("light");
  const [steps, setSteps] = useState<OnboardStep[]>(() => {
    if (authMode === "live") return [];
    const saved = readPersistedCursor();
    return saved == null ? stepsFromCursor(1) : stepsFromCursor(saved);
  });
  const [source, setSource] = useState<"preview" | "live">(
    authMode === "live" ? "live" : "preview",
  );
  const [checklistLive, setChecklistLive] = useState(false);
  const [loading, setLoading] = useState(authMode === "live");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authMode !== "live") {
      const saved = readPersistedCursor();
      if (saved != null && saved >= PROVISIONING_STEP_DEFS.length) {
        return;
      }
      let cursor = saved == null ? 1 : Math.max(saved, 1);
      const timer = window.setInterval(() => {
        cursor += 1;
        writePersistedCursor(cursor);
        if (cursor >= PROVISIONING_STEP_DEFS.length) {
          window.clearInterval(timer);
          setSteps(stepsFromCursor(cursor));
          return;
        }
        setSteps(stepsFromCursor(cursor));
      }, 2200);
      return () => window.clearInterval(timer);
    }

    let cancelled = false;

    async function loadLive() {
      const result = await fetchOnboardProgress();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      setError(null);
      setSteps([...result.steps]);
      setSource(result.source);
      setChecklistLive(result.checklistLive);
      setLoading(false);
    }

    void loadLive();
    const poll = window.setInterval(() => {
      void loadLive();
    }, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const processingIndex = steps.findIndex((s) => s.status === "processing");
  const stepLabel =
    processingIndex >= 0
      ? `Step ${String(processingIndex + 1)} of ${String(steps.length)}`
      : completedCount >= steps.length
        ? `All ${String(steps.length)} steps complete`
        : `Step ${String(completedCount + 1)} of ${String(steps.length)}`;
  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.round((completedCount / steps.length) * 100);
  }, [completedCount, steps.length]);

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
          {error ? (
            <Alert color="red" variant="light" w="100%">
              {error}
            </Alert>
          ) : null}
          <ThemeIcon size={56} radius="md" variant="light" color="navy">
            <Church size={28} aria-hidden />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Title order={2} style={{ fontWeight: 500, textAlign: "center" }}>
              Preparing Your Church Portal
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              {stepLabel} · {progressNote(source, checklistLive, loading)}
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
