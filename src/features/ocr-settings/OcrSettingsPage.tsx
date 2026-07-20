import {
  Badge,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { AlertDialog } from "@om/ui/alert-dialog";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { Table } from "@om/ui/table";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { canEditChurchSettings } from "../settings/settingsApi";
import {
  acceptClergyDiscovery,
  acceptLocationDiscovery,
  createOcrRule,
  defaultOcrChurchSettings,
  deleteOcrRule,
  discoverClergy,
  discoverLocations,
  fetchOcrChurchSettings,
  fetchOcrConfigEntities,
  fetchOcrRules,
  isSystemRule,
  mergeClergyEntities,
  mergeLocationEntities,
  parseClergyVariants,
  parseLocationMetadata,
  patchOcrConfigEntity,
  patchOcrRule,
  saveOcrChurchSettings,
  syncChurchLocationFromParish,
  type ClergyDiscoveryGroup,
  type LocationDiscoveryGroup,
  type OcrChurchSettings,
  type OcrConfigEntity,
  type OcrParishRule,
  type RuleTableRow,
  type EntityTableRow,
} from "./ocrSettingsApi";

function entityIsActive(entity: OcrConfigEntity): boolean {
  return entity.is_active !== false && entity.is_active !== 0;
}

function formatTenure(entity: OcrConfigEntity): string {
  const from = entity.active_from ?? "—";
  if (!entity.active_to) return `${from} → Current`;
  return `${from} → ${entity.active_to}`;
}

export function OcrSettingsPage() {
  const { user } = useAuth();
  const live = authMode === "live";
  const churchId = user?.churchId ?? null;
  const editable = canEditChurchSettings(user?.role);

  const [activeTab, setActiveTab] = useState<string | null>("documents");
  const [loading, setLoading] = useState(live);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<OcrChurchSettings>(defaultOcrChurchSettings());
  const [savedSettings, setSavedSettings] = useState<OcrChurchSettings>(defaultOcrChurchSettings());
  const [rules, setRules] = useState<OcrParishRule[]>([]);
  const [entities, setEntities] = useState<OcrConfigEntity[]>([]);

  const [discoverClergyOpen, setDiscoverClergyOpen] = useState(false);
  const [clergyGroups, setClergyGroups] = useState<ClergyDiscoveryGroup[]>([]);
  const [discoverLocationOpen, setDiscoverLocationOpen] = useState(false);
  const [locationGroups, setLocationGroups] = useState<LocationDiscoveryGroup[]>([]);

  const [selectedClergyIds, setSelectedClergyIds] = useState<number[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);

  const clergyEntities = useMemo(
    () => entities.filter((e) => e.entity_type === "clergy" && entityIsActive(e)),
    [entities],
  );
  const locationEntities = useMemo(
    () => entities.filter((e) => e.entity_type === "location" && entityIsActive(e)),
    [entities],
  );

  const ruleTableRows = useMemo<RuleTableRow[]>(
    () => rules.map((rule) => ({ id: String(rule.id), rule })),
    [rules],
  );
  const clergyTableRows = useMemo<EntityTableRow[]>(
    () => clergyEntities.map((entity) => ({ id: String(entity.id), entity })),
    [clergyEntities],
  );
  const locationTableRows = useMemo<EntityTableRow[]>(
    () => locationEntities.map((entity) => ({ id: String(entity.id), entity })),
    [locationEntities],
  );

  const loadAll = useCallback(async () => {
    if (!live || !churchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [settingsRes, rulesRes, entitiesRes] = await Promise.all([
      fetchOcrChurchSettings(churchId),
      fetchOcrRules(churchId),
      fetchOcrConfigEntities(churchId),
    ]);
    const errors: string[] = [];
    if (settingsRes.ok) {
      setSettings(settingsRes.data);
      setSavedSettings(settingsRes.data);
    } else errors.push(settingsRes.message);
    if (rulesRes.ok) setRules(rulesRes.data);
    else errors.push(rulesRes.message);
    if (entitiesRes.ok) setEntities(entitiesRes.data);
    else errors.push(entitiesRes.message);
    setError(errors.length ? errors.join(" ") : null);
    setLoading(false);
  }, [churchId, live]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external OCR settings bootstrap
    void loadAll();
  }, [loadAll]);

  async function saveDocuments() {
    if (!churchId) return;
    setStatus(null);
    const result = await saveOcrChurchSettings(churchId, {
      useRecordSnippets: settings.useRecordSnippets,
      documentProcessing: settings.documentProcessing,
      documentDeletion: settings.documentDeletion,
    });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setSavedSettings(result.data);
    setSettings(result.data);
    setStatus("Document processing settings saved.");
  }

  async function toggleRuleActive(rule: OcrParishRule, active: boolean) {
    if (!churchId || isSystemRule(rule)) return;
    const result = await patchOcrRule(churchId, rule.id, { is_active: active ? 1 : 0 });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    void loadAll();
  }

  async function runClergyDiscover() {
    if (!churchId) return;
    setStatus(null);
    const result = await discoverClergy(churchId);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setClergyGroups(result.data);
    setDiscoverClergyOpen(true);
  }

  async function confirmClergyDiscover() {
    if (!churchId || clergyGroups.length === 0) return;
    const result = await acceptClergyDiscovery(churchId, clergyGroups);
    setDiscoverClergyOpen(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus(result.data.message);
    void loadAll();
  }

  async function runLocationDiscover() {
    if (!churchId) return;
    setStatus(null);
    const result = await discoverLocations(churchId);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setLocationGroups(result.data);
    setDiscoverLocationOpen(true);
  }

  async function confirmLocationDiscover() {
    if (!churchId || locationGroups.length === 0) return;
    const result = await acceptLocationDiscovery(churchId, locationGroups);
    setDiscoverLocationOpen(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus(result.data.message);
    void loadAll();
  }

  async function deactivateEntity(entity: OcrConfigEntity) {
    if (!churchId) return;
    const result = await patchOcrConfigEntity(churchId, entity.id, { is_active: 0 });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    void loadAll();
  }

  async function mergeSelectedClergy() {
    if (!churchId || selectedClergyIds.length < 2) return;
    const canonical = clergyEntities.find((e) => e.id === selectedClergyIds[0])?.canonical_value;
    if (!canonical) return;
    const result = await mergeClergyEntities(churchId, selectedClergyIds, canonical);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setSelectedClergyIds([]);
    setStatus("Clergy records merged.");
    void loadAll();
  }

  async function mergeSelectedLocations() {
    if (!churchId || selectedLocationIds.length < 2) return;
    const canonical = locationEntities.find((e) => e.id === selectedLocationIds[0])?.canonical_value;
    if (!canonical) return;
    const result = await mergeLocationEntities(churchId, selectedLocationIds, canonical);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setSelectedLocationIds([]);
    setStatus("Locations merged.");
    void loadAll();
  }

  async function syncParishLocation() {
    if (!churchId) return;
    const result = await syncChurchLocationFromParish(churchId);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus("Church location synced from parish settings.");
    void loadAll();
  }

  async function addParishRule() {
    if (!churchId) return;
    const result = await createOcrRule(churchId, {
      name: "Parish custom rule",
      description: "Created from Portal2 OCR settings",
      record_type: "baptism",
      severity: "suggestion",
      priority: 50,
      conditions_json: { all: [{ field: "clergy", operator: "is_empty" }] },
      actions_json: [{ type: "suggest_value", field: "clergy", auto_apply: false }],
    });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus("Parish rule created — edit details in legacy studio until inline editor ships.");
    void loadAll();
  }

  if (!live) {
    return (
      <PageLayout
        title="OCR settings"
        description="Parish OCR administration — rules, clergy, locations, and document retention."
      >
        <Text size="sm" c="dimmed">
          OCR settings require live auth mode. Enable VITE_PORTAL_AUTH_MODE=live for church 46.
        </Text>
      </PageLayout>
    );
  }

  if (!churchId) {
    return (
      <PageLayout title="OCR settings" description="Parish OCR administration.">
        <Text size="sm" c="red" role="alert">
          No church context on your session — OCR settings cannot load.
        </Text>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="OCR settings"
      description="Configure validation rules, canonical clergy and burial locations, and document retention for OCR workflows."
    >
      <Stack gap="md">
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
            Your role can view OCR settings but cannot edit them. Priest or church administrator
            access is required.
          </Text>
        ) : null}

        {loading ? (
          <Text size="sm" c="dimmed">
            Loading OCR settings…
          </Text>
        ) : (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="documents">Documents</Tabs.Tab>
              <Tabs.Tab value="rules">Rules engine</Tabs.Tab>
              <Tabs.Tab value="clergy">Parish clergy</Tabs.Tab>
              <Tabs.Tab value="locations">Locations</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="documents" pt="md">
              <Card padding="lg">
                <Stack gap="md">
                  <Title order={4}>Document processing</Title>
                  <Text size="sm" c="dimmed">
                    Controls for Portal2 desktop/mobile OCR ingest. Provider and engine settings
                    remain platform-managed.
                  </Text>
                  <Switch
                    isSelected={settings.useRecordSnippets}
                    onSelectionChange={(v) =>
                      setSettings((s) => ({ ...s, useRecordSnippets: v }))
                    }
                    isDisabled={!editable}
                  >
                    Use record snippets (autoseed hints)
                  </Switch>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Select
                      label="Spelling correction"
                      data={[
                        { value: "fix", label: "Fix common OCR errors" },
                        { value: "exact", label: "Exact text only" },
                      ]}
                      value={settings.documentProcessing.spellingCorrection}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          documentProcessing: {
                            ...s.documentProcessing,
                            spellingCorrection: v === "exact" ? "exact" : "fix",
                          },
                        }))
                      }
                      disabled={!editable}
                    />
                    <Select
                      label="Record layout mode"
                      data={[
                        { value: "auto", label: "Auto-detect" },
                        { value: "single", label: "Single record" },
                        { value: "ledger", label: "Ledger page" },
                        { value: "multi_record_split", label: "Multi-record split" },
                        { value: "multi_form_page", label: "Multi-form page" },
                      ]}
                      value={settings.documentProcessing.recordLayoutMode}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          documentProcessing: {
                            ...s.documentProcessing,
                            recordLayoutMode: (v ?? "auto") as OcrChurchSettings["documentProcessing"]["recordLayoutMode"],
                          },
                        }))
                      }
                      disabled={!editable}
                    />
                  </SimpleGrid>

                  <Title order={5} mt="sm">
                    Document retention
                  </Title>
                  <Group align="flex-end" gap="sm">
                    <NumberInput
                      label="Delete uploaded documents after"
                      value={settings.documentDeletion.deleteAfter}
                      min={1}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          documentDeletion: {
                            ...s.documentDeletion,
                            deleteAfter: Number(v) || 1,
                          },
                        }))
                      }
                      disabled={!editable}
                      style={{ flex: 1 }}
                    />
                    <Select
                      label="Unit"
                      data={[
                        { value: "minutes", label: "Minutes" },
                        { value: "hours", label: "Hours" },
                        { value: "days", label: "Days" },
                      ]}
                      value={settings.documentDeletion.deleteUnit}
                      onChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          documentDeletion: {
                            ...s.documentDeletion,
                            deleteUnit: (v ?? "days") as OcrChurchSettings["documentDeletion"]["deleteUnit"],
                          },
                        }))
                      }
                      disabled={!editable}
                      style={{ width: 140 }}
                    />
                  </Group>

                  {editable ? (
                    <Group justify="flex-end">
                      <Button
                        className="om-btn-primary"
                        size="sm"
                        onAction={() => void saveDocuments()}
                        isDisabled={
                          JSON.stringify(settings) === JSON.stringify(savedSettings)
                        }
                      >
                        Save document settings
                      </Button>
                    </Group>
                  ) : null}
                </Stack>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="rules" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    System rules are read-only. Parish rules can be enabled, disabled, or removed.
                  </Text>
                  {editable ? (
                    <Button className="om-btn-ghost" size="sm" onAction={() => void addParishRule()}>
                      Add parish rule
                    </Button>
                  ) : null}
                </Group>
                <Table
                  accessibleLabel="OCR validation rules"
                  emptyMessage="No rules loaded."
                  isStriped
                  columns={[
                    {
                      id: "name",
                      header: "Name",
                      isRowHeader: true,
                      renderCell: (row) => (
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {row.rule.name}
                          </Text>
                          {row.rule.description ? (
                            <Text size="xs" c="dimmed">
                              {row.rule.description}
                            </Text>
                          ) : null}
                        </Stack>
                      ),
                    },
                    {
                      id: "record_type",
                      header: "Record type",
                      renderCell: (row) => row.rule.record_type,
                    },
                    {
                      id: "severity",
                      header: "Severity",
                      renderCell: (row) => (
                        <Badge size="sm" variant="light">
                          {row.rule.severity}
                        </Badge>
                      ),
                    },
                    {
                      id: "scope",
                      header: "Scope",
                      renderCell: (row) => (isSystemRule(row.rule) ? "System" : "Parish"),
                    },
                    {
                      id: "active",
                      header: "Active",
                      renderCell: (row) => (
                        <Switch
                          isSelected={asBool(row.rule.is_active)}
                          onSelectionChange={(v) => void toggleRuleActive(row.rule, v)}
                          isDisabled={!editable || isSystemRule(row.rule)}
                        >
                          Active
                        </Switch>
                      ),
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      renderCell: (row) =>
                        !isSystemRule(row.rule) && editable ? (
                          <Button
                            className="om-btn-ghost"
                            size="sm"
                            variant="secondary"
                            onAction={() =>
                              void deleteOcrRule(churchId, row.rule.id).then((r) => {
                                if (!r.ok) setStatus(r.message);
                                else void loadAll();
                              })
                            }
                          >
                            Delete
                          </Button>
                        ) : null,
                    },
                  ]}
                  rows={ruleTableRows}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="clergy" pt="md">
              <Stack gap="md">
                <Group>
                  {editable ? (
                    <>
                      <Button className="om-btn-primary" size="sm" onAction={() => void runClergyDiscover()}>
                        Rediscover from records
                      </Button>
                      <Button
                        className="om-btn-ghost"
                        size="sm"
                        onAction={() => void mergeSelectedClergy()}
                        isDisabled={selectedClergyIds.length < 2}
                      >
                        Merge selected
                      </Button>
                    </>
                  ) : null}
                </Group>
                <Text size="sm" c="dimmed">
                  Canonical clergy names require priest/admin confirmation before discovery results
                  are accepted. Shared across OCR and record editors.
                </Text>
                <Table
                  accessibleLabel="Parish clergy configuration"
                  emptyMessage="No clergy entities configured."
                  isStriped
                  columns={[
                    {
                      id: "select",
                      header: "Select",
                      renderCell: (row) => (
                        <input
                          type="checkbox"
                          checked={selectedClergyIds.includes(row.entity.id)}
                          onChange={(e) => {
                            setSelectedClergyIds((prev) =>
                              e.target.checked
                                ? [...prev, row.entity.id]
                                : prev.filter((id) => id !== row.entity.id),
                            );
                          }}
                          disabled={!editable}
                        />
                      ),
                    },
                    {
                      id: "name",
                      header: "Canonical name",
                      isRowHeader: true,
                      renderCell: (row) => row.entity.canonical_value,
                    },
                    {
                      id: "role",
                      header: "Role",
                      renderCell: (row) => row.entity.role ?? "—",
                    },
                    {
                      id: "tenure",
                      header: "Tenure",
                      renderCell: (row) => formatTenure(row.entity),
                    },
                    {
                      id: "variants",
                      header: "Variants",
                      renderCell: (row) => {
                        const variants = parseClergyVariants(row.entity.variants_json);
                        return (
                          <Text size="xs" c="dimmed">
                            {variants
                              .slice(0, 3)
                              .map((v) => `${v.value} (${String(v.count)})`)
                              .join(", ") || "—"}
                          </Text>
                        );
                      },
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      renderCell: (row) =>
                        editable ? (
                          <Button
                            className="om-btn-ghost"
                            size="sm"
                            variant="secondary"
                            onAction={() => void deactivateEntity(row.entity)}
                          >
                            Deactivate
                          </Button>
                        ) : null,
                    },
                  ]}
                  rows={clergyTableRows}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="locations" pt="md">
              <Stack gap="md">
                <Group>
                  {editable ? (
                    <>
                      <Button className="om-btn-primary" size="sm" onAction={() => void runLocationDiscover()}>
                        Rediscover burial locations
                      </Button>
                      <Button className="om-btn-ghost" size="sm" onAction={() => void syncParishLocation()}>
                        Sync church from parish settings
                      </Button>
                      <Button
                        className="om-btn-ghost"
                        size="sm"
                        onAction={() => void mergeSelectedLocations()}
                        isDisabled={selectedLocationIds.length < 2}
                      >
                        Merge selected
                      </Button>
                    </>
                  ) : null}
                </Group>
                <Table
                  accessibleLabel="Canonical locations"
                  emptyMessage="No location entities configured."
                  isStriped
                  columns={[
                    {
                      id: "select",
                      header: "Select",
                      renderCell: (row) => (
                        <input
                          type="checkbox"
                          checked={selectedLocationIds.includes(row.entity.id)}
                          onChange={(e) => {
                            setSelectedLocationIds((prev) =>
                              e.target.checked
                                ? [...prev, row.entity.id]
                                : prev.filter((id) => id !== row.entity.id),
                            );
                          }}
                          disabled={!editable}
                        />
                      ),
                    },
                    {
                      id: "name",
                      header: "Name",
                      isRowHeader: true,
                      renderCell: (row) => row.entity.canonical_value,
                    },
                    {
                      id: "type",
                      header: "Type",
                      renderCell: (row) =>
                        parseLocationMetadata(row.entity.metadata_json).location_type ?? "Other",
                    },
                    {
                      id: "address",
                      header: "Address",
                      renderCell: (row) => {
                        const meta = parseLocationMetadata(row.entity.metadata_json);
                        return (
                          [meta.street_address, meta.city, meta.state_province, meta.postal_code]
                            .filter(Boolean)
                            .join(", ") || "—"
                        );
                      },
                    },
                    {
                      id: "variants",
                      header: "Variants",
                      renderCell: (row) => {
                        const variants = parseClergyVariants(row.entity.variants_json);
                        return (
                          <Text size="xs" c="dimmed">
                            {variants
                              .slice(0, 2)
                              .map((v) => `${v.value} (${String(v.count)})`)
                              .join(", ") || "—"}
                          </Text>
                        );
                      },
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      renderCell: (row) =>
                        editable ? (
                          <Button
                            className="om-btn-ghost"
                            size="sm"
                            variant="secondary"
                            onAction={() => void deactivateEntity(row.entity)}
                          >
                            Deactivate
                          </Button>
                        ) : null,
                    },
                  ]}
                  rows={locationTableRows}
                />
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Stack>

      <AlertDialog
        isOpen={discoverClergyOpen}
        onOpenChange={setDiscoverClergyOpen}
        title="Confirm clergy discovery"
        description={`Review ${String(clergyGroups.length)} proposed clergy group(s) before accepting. Names are not finalized until you confirm.`}
        confirmLabel="Accept selected groups"
        cancelLabel="Cancel"
        onConfirm={() => void confirmClergyDiscover()}
        onCancel={() => setDiscoverClergyOpen(false)}
      />

      <AlertDialog
        isOpen={discoverLocationOpen}
        onOpenChange={setDiscoverLocationOpen}
        title="Confirm location discovery"
        description={`Review ${String(locationGroups.length)} proposed burial location group(s) before accepting.`}
        confirmLabel="Accept selected groups"
        cancelLabel="Cancel"
        onConfirm={() => void confirmLocationDiscover()}
        onCancel={() => setDiscoverLocationOpen(false)}
      />
    </PageLayout>
  );
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}
