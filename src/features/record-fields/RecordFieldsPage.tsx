import { Badge, Card, Group, Stack, Tabs, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { Table } from "@om/ui/table";
import { TextField } from "@om/ui/text-field";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { canEditChurchSettings } from "../settings/settingsApi";
import {
  fetchRecordFieldConfig,
  PROTECTED_FIELD_KEYS,
  RECORD_FIELD_TYPE_OPTIONS,
  reorderFieldRows,
  resetRecordTypeToDefaults,
  saveRecordFieldConfig,
  type RecordFieldConfig,
  type RecordFieldRow,
  type RecordFieldTableRow,
  type RecordFieldTypeKey,
} from "./recordFieldsApi";

function configsEqual(a: RecordFieldConfig, b: RecordFieldConfig, type: RecordFieldTypeKey): boolean {
  return JSON.stringify(a[type] ?? []) === JSON.stringify(b[type] ?? []);
}

export function RecordFieldsPage() {
  const { user } = useAuth();
  const live = authMode === "live";
  const churchId = user?.churchId ?? null;
  const editable = canEditChurchSettings(user?.role);

  const [recordType, setRecordType] = useState<RecordFieldTypeKey>("baptism");
  const [fields, setFields] = useState<RecordFieldConfig>({});
  const [defaults, setDefaults] = useState<RecordFieldConfig>({});
  const [savedFields, setSavedFields] = useState<RecordFieldConfig>({});
  const [loading, setLoading] = useState(live);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => fields[recordType] ?? [], [fields, recordType]);
  const tableRows = useMemo<RecordFieldTableRow[]>(
    () => rows.map((field) => ({ id: field.key, field })),
    [rows],
  );
  const dirty = !configsEqual(fields, savedFields, recordType);

  const load = useCallback(async () => {
    if (!live || !churchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchRecordFieldConfig(churchId);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFields(result.data.fields);
    setSavedFields(result.data.fields);
    setDefaults(result.data.defaults);
    setError(null);
  }, [churchId, live]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external record field mapping bootstrap
    void load();
  }, [load]);

  function updateRow(key: string, patch: Partial<RecordFieldRow>) {
    setFields((prev) => {
      const current = [...(prev[recordType] ?? [])];
      const idx = current.findIndex((r) => r.key === key);
      if (idx < 0) return prev;
      const existing = current[idx];
      if (!existing) return prev;
      if (PROTECTED_FIELD_KEYS.has(key) && patch.visible === false) return prev;
      current[idx] = { ...existing, ...patch };
      return { ...prev, [recordType]: current };
    });
  }

  function moveRow(index: number, direction: -1 | 1) {
    setFields((prev) => ({
      ...prev,
      [recordType]: reorderFieldRows(prev[recordType] ?? [], index, direction),
    }));
  }

  async function save() {
    if (!churchId) return;
    setSaving(true);
    setStatus(null);
    const result = await saveRecordFieldConfig(churchId, fields);
    setSaving(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setFields(result.data);
    setSavedFields(result.data);
    setStatus("Record field mapping saved.");
  }

  function cancel() {
    setFields(savedFields);
    setStatus(null);
  }

  function resetType() {
    setFields((prev) => resetRecordTypeToDefaults(prev, recordType, defaults));
    setStatus("Reset to server defaults — save to persist.");
  }

  if (!live) {
    return (
      <PageLayout
        title="Record field mapping"
        description="Per-record-type labels, visibility, and display order."
      >
        <Text size="sm" c="dimmed">
          Record field mapping requires live auth. Legacy mapping lived at
          /account/parish-management/record-settings — not routed in Portal2 until this
          release.
        </Text>
      </PageLayout>
    );
  }

  if (!churchId) {
    return (
      <PageLayout title="Record field mapping" description="Configure sacramental field presentation.">
        <Text size="sm" c="red" role="alert">
          No church context — record field mapping cannot load.
        </Text>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Record field mapping"
      description="Presentation-only overrides for baptism, marriage, and funeral records. Physical DB columns are never renamed."
    >
      <Stack gap="md" maw={960}>
        <Text size="sm" c="dimmed">
          API: GET/PUT /api/church/:id/ocr/record-fields (stored in ocr_settings.settings_json).
          Legacy Parish Management hub route was not deleted — Portal2 had no nav entry until now.
        </Text>
        {error ? (
          <Text size="sm" c="red" role="alert">
            {error}
          </Text>
        ) : null}
        {status ? (
          <Text size="sm" role="status">
            {status}
          </Text>
        ) : null}
        {!editable ? (
          <Text size="sm" c="dimmed">
            View-only for your role. Priest or church administrator can edit mappings.
          </Text>
        ) : null}

        <Tabs
          value={recordType}
          onChange={(v) => {
            if (v) setRecordType(v as RecordFieldTypeKey);
          }}
        >
          <Tabs.List>
            {RECORD_FIELD_TYPE_OPTIONS.map((opt) => (
              <Tabs.Tab key={opt.value} value={opt.value} disabled={!opt.live}>
                {opt.label}
                {!opt.live ? " (future)" : ""}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>{recordType} fields</Title>
              {editable ? (
                <Group gap="sm">
                  <Button className="om-btn-ghost" size="sm" onAction={resetType}>
                    Reset to defaults
                  </Button>
                  <Button className="om-btn-ghost" size="sm" onAction={cancel} isDisabled={!dirty}>
                    Cancel
                  </Button>
                  <Button
                    className="om-btn-primary"
                    size="sm"
                    onAction={() => void save()}
                    isPending={saving}
                    isDisabled={!dirty || saving}
                  >
                    Save
                  </Button>
                </Group>
              ) : null}
            </Group>

            {loading ? (
              <Text size="sm" c="dimmed">
                Loading field mapping…
              </Text>
            ) : (
              <Table
                accessibleLabel={`${recordType} record field mapping`}
                emptyMessage="No field definitions returned from API."
                isStriped
                columns={[
                  {
                    id: "order",
                    header: "Order",
                    renderCell: (row) => {
                      const index = rows.findIndex((r) => r.key === row.field.key);
                      return (
                        <Group gap={4}>
                          <Button
                            className="om-btn-ghost"
                            size="sm"
                            variant="secondary"
                            onAction={() => moveRow(index, -1)}
                            isDisabled={!editable || index <= 0}
                          >
                            ↑
                          </Button>
                          <Button
                            className="om-btn-ghost"
                            size="sm"
                            variant="secondary"
                            onAction={() => moveRow(index, 1)}
                            isDisabled={!editable || index < 0 || index >= rows.length - 1}
                          >
                            ↓
                          </Button>
                        </Group>
                      );
                    },
                  },
                  {
                    id: "key",
                    header: "Field key",
                    isRowHeader: true,
                    renderCell: (row) => (
                      <Group gap="xs">
                        <Text size="sm">{row.field.key}</Text>
                        {PROTECTED_FIELD_KEYS.has(row.field.key) ? (
                          <Badge size="xs" variant="light">
                            protected
                          </Badge>
                        ) : null}
                      </Group>
                    ),
                  },
                  {
                    id: "label",
                    header: "Label override",
                    renderCell: (row) =>
                      editable ? (
                        <TextField
                          label={`Label for ${row.field.key}`}
                          value={row.field.label}
                          onValueChange={(value) => updateRow(row.field.key, { label: value })}
                        />
                      ) : (
                        row.field.label
                      ),
                  },
                  {
                    id: "header",
                    header: "Header override",
                    renderCell: (row) =>
                      editable ? (
                        <TextField
                          label={`Header for ${row.field.key}`}
                          value={row.field.headerLabel}
                          onValueChange={(value) => updateRow(row.field.key, { headerLabel: value })}
                        />
                      ) : (
                        row.field.headerLabel
                      ),
                  },
                  {
                    id: "visible",
                    header: "Visible",
                    renderCell: (row) => (
                      <Switch
                        isSelected={row.field.visible}
                        onSelectionChange={(v) => updateRow(row.field.key, { visible: v })}
                        isDisabled={!editable || PROTECTED_FIELD_KEYS.has(row.field.key)}
                      >
                        Visible
                      </Switch>
                    ),
                  },
                  {
                    id: "required",
                    header: "Required",
                    renderCell: (row) => (
                      <Switch
                        isSelected={row.field.required}
                        onSelectionChange={(v) => updateRow(row.field.key, { required: v })}
                        isDisabled={!editable || PROTECTED_FIELD_KEYS.has(row.field.key)}
                      >
                        Required
                      </Switch>
                    ),
                  },
                ]}
                rows={tableRows}
              />
            )}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
