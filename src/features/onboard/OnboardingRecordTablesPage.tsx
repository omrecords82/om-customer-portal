import {
  Alert,
  Box,
  Card,
  Checkbox,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { OnboardingWizardStepper } from "./OnboardingWizardStepper";
import {
  completeRecordTables,
  fetchOnboardingMeSlice,
  fetchRecordTables,
  resolveFirstLoginWizardPath,
  saveRecordTablesDraft,
  type RecordTableDef,
} from "./onboardWizardApi";

function updateTableColumn(
  tables: RecordTableDef[],
  tableIndex: number,
  columnKey: string,
  patch: Partial<RecordTableDef["columns"][number]>,
): RecordTableDef[] {
  return tables.map((table, ti) => {
    if (ti !== tableIndex) return table;
    return {
      ...table,
      columns: table.columns.map((col) =>
        col.column_key === columnKey ? { ...col, ...patch } : col,
      ),
    };
  });
}

export function OnboardingRecordTablesPage() {
  const navigate = useNavigate();
  const live = authMode === "live";

  const [tables, setTables] = useState<RecordTableDef[]>([]);
  const [refId, setRefId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (redirect && redirect !== "/onboarding/record-tables") {
      void navigate(redirect, { replace: true });
      return;
    }

    const result = await fetchRecordTables();
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
    if (data.tableConfigurationCompleted && data.layoutConfigurationCompleted) {
      void navigate("/", { replace: true });
      return;
    }
    if (data.tableConfigurationCompleted && !data.layoutConfigurationCompleted) {
      void navigate("/onboarding/record-layouts", { replace: true });
      return;
    }

    setTables([...data.tables]);
    setRefId(data.onboardingRequestId);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external record tables bootstrap
    void load();
  }, [load]);

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await saveRecordTablesDraft(tables);
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
      const result = await completeRecordTables(tables);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      void navigate(result.redirectTo, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageLayout title="Configure Record Tables" description="Loading record table setup…">
        <Group justify="center" py="xl">
          <Loader aria-label="Loading record tables" />
        </Group>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Configure Record Tables"
      description="Review and customize sacramental record column headers."
    >
      <Box maw={920} mx="auto">
            <OnboardingWizardStepper activeStep="record-tables" />
        <Title order={2} mb="xs">
          Review your record tables
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Enrollment reference: <strong>{refId || "—"}</strong>. Customize column headers for each
          sacramental record type you selected.
        </Text>
        {!live ? (
          <Alert variant="light" color="blue" mb="md">
            Preview mode — table edits persist on this device until live onboarding APIs are used.
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

        <Stack gap="md" mb="lg">
          {tables.map((table, tableIndex) => (
            <Card key={table.record_type} withBorder padding="lg">
              <Title order={4} mb="sm">
                {table.display_name}
              </Title>
              <Stack gap="sm">
                {table.columns
                  .filter((col) => col.visible !== false)
                  .map((col) => {
                    const editable = col.editable !== false;
                    return (
                      <Group key={col.column_key} align="flex-end" wrap="nowrap" gap="md">
                        <TextInput
                          size="sm"
                          style={{ flex: 1 }}
                          label={col.column_key}
                          value={col.display_label}
                          disabled={!editable}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setTables((prev) =>
                              updateTableColumn(prev, tableIndex, col.column_key, {
                                display_label: value,
                              }),
                            );
                          }}
                          description={col.required ? "Required" : "Optional"}
                        />
                        {!col.required ? (
                          <Checkbox
                            label="Show"
                            checked={col.visible !== false}
                            onChange={(event) => {
                              setTables((prev) =>
                                updateTableColumn(prev, tableIndex, col.column_key, {
                                  visible: event.currentTarget.checked,
                                }),
                              );
                            }}
                          />
                        ) : null}
                      </Group>
                    );
                  })}
              </Stack>
            </Card>
          ))}
        </Stack>

        <Group gap="sm">
          <Button variant="secondary" isDisabled={busy} onAction={() => void saveDraft()}>
            Save draft
          </Button>
          <Button
            variant="primary"
            isDisabled={busy}
            isPending={busy}
            onAction={() => void complete()}
          >
            Complete setup
          </Button>
        </Group>
      </Box>
    </PageLayout>
  );
}
