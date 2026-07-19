import {
  Alert,
  Badge,
  Box,
  Card,
  Checkbox,
  Group,
  Image,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import { ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { OnboardingWizardStepper } from "./OnboardingWizardStepper";
import {
  allRecordTypesHaveLayoutSelection,
  completeRecordLayouts,
  fetchOnboardingMeSlice,
  fetchRecordLayouts,
  RECORD_TYPE_LABELS,
  resolveFirstLoginWizardPath,
  saveRecordLayoutsDraft,
  type CatalogLayout,
  type LayoutSelections,
} from "./onboardWizardApi";

export function OnboardingRecordLayoutsPage() {
  const navigate = useNavigate();
  const live = authMode === "live";

  const [refId, setRefId] = useState("");
  const [recordTypes, setRecordTypes] = useState<string[]>([]);
  const [catalogByType, setCatalogByType] = useState<Record<string, CatalogLayout[]>>({});
  const [selections, setSelections] = useState<LayoutSelections>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<CatalogLayout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const meResult = await fetchOnboardingMeSlice();
    if (!meResult.ok) {
      setError(meResult.message);
      setLoading(false);
      return;
    }

    const redirect = resolveFirstLoginWizardPath(meResult.data);
    if (redirect && redirect !== "/onboarding/record-layouts") {
      void navigate(redirect, { replace: true });
      return;
    }

    const result = await fetchRecordLayouts();
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    const data = result.data;
    if (data.mustChangePassword) {
      void navigate("/onboarding/change-password", { replace: true });
      return;
    }
    if (!data.tableConfigurationCompleted) {
      void navigate("/onboarding/record-tables", { replace: true });
      return;
    }
    if (data.layoutConfigurationCompleted) {
      void navigate("/", { replace: true });
      return;
    }

    setRefId(data.onboardingRequestId);
    setRecordTypes([...data.selectedRecordTypes]);
    setCatalogByType(data.catalogByType);
    setSelections({ ...data.selections });
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external record layouts bootstrap
    void load();
  }, [load]);

  function toggleLayout(recordType: string, layoutId: string) {
    setSelections((prev) => {
      const current = prev[recordType] ?? [];
      const next = current.includes(layoutId)
        ? current.filter((id) => id !== layoutId)
        : [...current, layoutId];
      return { ...prev, [recordType]: next };
    });
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await saveRecordLayoutsDraft(selections);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatus(
        result.source === "preview"
          ? "Draft saved on this device (preview mode)."
          : "Draft saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await completeRecordLayouts(selections);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      void navigate(result.redirectTo, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  const allSelected = allRecordTypesHaveLayoutSelection(recordTypes, selections);

  if (loading) {
    return (
      <PageLayout title="Identify Your Record Layouts" description="Loading layout catalog…">
        <Group justify="center" py="xl">
          <Loader aria-label="Loading record layouts" />
        </Group>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Identify Your Record Layouts"
      description="Select ledger layouts that match records you plan to upload."
    >
      <Box maw={1100} mx="auto">
        <OnboardingWizardStepper activeStep="record-layouts" />
        <Title order={2} mb="xs">
          Church record layout analysis
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Enrollment reference: <strong>{refId || "—"}</strong>. Select every layout that matches
          records you plan to upload. Sources are anonymized — no parish names are shown.
        </Text>
        {!live ? (
          <Alert variant="light" color="blue" mb="md">
            Preview mode — layout selections persist on this device only.
          </Alert>
        ) : null}
        {error ? (
          <Alert color="red" variant="light" mb="md">
            {error}
          </Alert>
        ) : null}
        {status ? (
          <Alert color="teal" variant="light" mb="md">
            {status}
          </Alert>
        ) : null}

        {recordTypes.map((recordType) => (
          <Box key={recordType} mb="xl">
            <Group gap="sm" mb="md">
              <Title order={4}>{RECORD_TYPE_LABELS[recordType] ?? recordType} records</Title>
              <Badge variant="light" color={(selections[recordType] ?? []).length > 0 ? "navy" : "gray"}>
                {(selections[recordType] ?? []).length} selected
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {(catalogByType[recordType] ?? []).map((layout) => {
                const selected = (selections[recordType] ?? []).includes(layout.id);
                return (
                  <Card
                    key={layout.id}
                    withBorder
                    padding={0}
                    style={{
                      borderColor: selected
                        ? "var(--mantine-color-gold-5)"
                        : "var(--mantine-color-default-border)",
                      borderWidth: selected ? 2 : 1,
                      background: selected ? "rgba(212, 175, 55, 0.06)" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => toggleLayout(recordType, layout.id)}
                  >
                    <Box pos="relative">
                      <Image
                        src={layout.thumbnail}
                        alt={layout.title}
                        h={140}
                        fit="cover"
                        fallbackSrc=""
                      />
                      <Box
                        style={{ position: "absolute", top: 8, right: 8 }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          aria-label={`Enlarge ${layout.title} preview`}
                          onAction={() => setPreviewLayout(layout)}
                        >
                          <ZoomIn size={16} aria-hidden />
                        </Button>
                      </Box>
                    </Box>
                    <Stack gap="xs" p="md">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Text fw={600} size="sm">
                          {layout.title}
                        </Text>
                        <Checkbox checked={selected} readOnly tabIndex={-1} aria-label={`Select ${layout.title}`} />
                      </Group>
                      <Text size="sm" c="dimmed">
                        {layout.description}
                      </Text>
                      <Group gap="xs">
                        {layout.era_hint ? (
                          <Badge variant="outline" size="sm">
                            {layout.era_hint}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" size="sm">
                          {layout.extraction_mode.replaceAll("_", " ")}
                        </Badge>
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Box>
        ))}

        <Group gap="sm" mt="md">
          <Button
            variant="secondary"
            isDisabled={busy}
            onAction={() => {
              void navigate("/onboarding/record-tables");
            }}
          >
            Back
          </Button>
          <Button variant="secondary" isDisabled={busy} onAction={() => void saveDraft()}>
            Save draft
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || !allSelected}
            isPending={busy}
            onAction={() => void complete()}
          >
            Complete setup
          </Button>
        </Group>
        {!allSelected ? (
          <Text size="xs" c="dimmed" mt="xs">
            Select at least one layout for each record type you enrolled with.
          </Text>
        ) : null}
      </Box>

      <Modal
        opened={previewLayout != null}
        onClose={() => setPreviewLayout(null)}
        title={previewLayout?.title}
        size="lg"
        centered
      >
        {previewLayout ? (
          <Stack gap="sm">
            <Image
              src={previewLayout.thumbnail}
              alt={previewLayout.title}
              fit="contain"
              mah="70vh"
              fallbackSrc=""
            />
            <Text size="sm" c="dimmed">
              {previewLayout.description}
            </Text>
          </Stack>
        ) : null}
      </Modal>
    </PageLayout>
  );
}
