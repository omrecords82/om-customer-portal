import {
  Alert,
  Autocomplete,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { AlertDialog } from "@om/ui/alert-dialog";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  createBaptismRecord,
  deleteBaptismRecord,
  fetchBaptismRecord,
  fetchClergyOptions,
  fetchLocationOptions,
  updateBaptismRecord,
} from "./baptismEditorApi";
import { BaptismHistoryPanel } from "./BaptismHistoryPanel";
import {
  BAPTISM_ENTRY_TYPE_OPTIONS,
  EMPTY_BAPTISM_FORM,
  formStateToCreatePayload,
  formStateToUpdatePayload,
  normalizeBaptismEntryType,
  normalizeDateInput,
  todayIsoDate,
  validateBaptismFormForCreate,
  validateBaptismFormForUpdate,
  type BaptismFormState,
} from "./baptismEditorMappers";
import {
  buildRecordsEditorRoute,
  canManageRecords,
  canNavigateToRecordsEditor,
  resolveRecordsEditorFlags,
} from "./recordsEditorFlags";

type EditorMode = "create" | "edit";

function resolveMode(recordIdParam: string | undefined): EditorMode {
  return recordIdParam ? "edit" : "create";
}

/**
 * Wave H — Baptism sacramental editor (create / edit / view).
 * Gated by dual-run flag + live auth + session church_id + deacon+ role.
 */
export function BaptismEditorPage() {
  const navigate = useNavigate();
  const { recordId: recordIdParam } = useParams<{ readonly recordId?: string }>();
  const mode = resolveMode(recordIdParam);
  const numericId =
    mode === "edit" && recordIdParam && /^\d+$/.test(recordIdParam)
      ? Number(recordIdParam)
      : null;

  const { user, ready, isAuthenticated } = useAuth();
  const editorFlags = useMemo(() => resolveRecordsEditorFlags(), []);
  const editorReady = useMemo(
    () =>
      canNavigateToRecordsEditor({
        flags: editorFlags,
        type: "baptism",
        authMode,
        churchId: user?.churchId ?? null,
        role: user?.role ?? null,
        editorsUiShipped: true,
      }),
    [editorFlags, user?.churchId, user?.role],
  );

  const churchId = user?.churchId ?? 0;

  const [form, setForm] = useState<BaptismFormState>(EMPTY_BAPTISM_FORM);
  const [recordStatus, setRecordStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const maxDate = todayIsoDate();

  const [clergyOptions, setClergyOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const pageTitle = mode === "create" ? "New baptism record" : "Edit baptism record";
  const canDelete = mode === "edit" && canManageRecords(user?.role ?? undefined);
  const deleteTargetName =
    [form.first_name, form.last_name].filter(Boolean).join(" ").trim() ||
    (numericId != null ? `record #${String(numericId)}` : "this record");

  const updateField = useCallback(
    <K extends keyof BaptismFormState>(key: K, value: BaptismFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  useEffect(() => {
    if (!ready || !isAuthenticated || !editorReady || churchId <= 0) return;

    let cancelled = false;
    setLookupsLoading(true);

    void Promise.all([
      fetchClergyOptions(churchId),
      fetchLocationOptions(churchId),
    ]).then(([clergy, locations]) => {
      if (cancelled) return;
      setLookupsLoading(false);
      if (clergy.ok) {
        setClergyOptions(clergy.data.map((o) => o.value));
      }
      if (locations.ok) {
        setLocationOptions(locations.data.map((o) => o.value));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, editorReady, churchId]);

  useEffect(() => {
    if (mode !== "edit" || numericId == null) return;
    if (!ready || !isAuthenticated || !editorReady || churchId <= 0) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void fetchBaptismRecord(churchId, numericId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setForm({
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        birth_date: normalizeDateInput(result.data.birth_date),
        reception_date: normalizeDateInput(result.data.reception_date),
        birthplace: result.data.birthplace,
        entry_type: result.data.entry_type,
        sponsors: result.data.sponsors,
        parents: result.data.parents,
        clergy: result.data.clergy,
      });
      setRecordStatus(result.data.status);
    });

    return () => {
      cancelled = true;
    };
  }, [mode, numericId, ready, isAuthenticated, editorReady, churchId]);

  async function handleSave() {
    setError(null);
    setStatusMessage(null);

    const validation =
      mode === "create"
        ? validateBaptismFormForCreate(form)
        : validateBaptismFormForUpdate(form);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setSaving(true);
    const result =
      mode === "create"
        ? await createBaptismRecord(churchId, formStateToCreatePayload(form, churchId))
        : numericId != null
          ? await updateBaptismRecord(
              churchId,
              numericId,
              formStateToUpdatePayload(form, churchId),
            )
          : { ok: false as const, status: 400, message: "Missing record id." };

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setStatusMessage(mode === "create" ? "Baptism record created." : "Baptism record saved.");
    setHistoryRefreshKey((value) => value + 1);
    if (mode === "create") {
      navigate(buildRecordsEditorRoute("baptism", { recordId: result.data.id, action: "edit" }), {
        replace: true,
      });
    }
  }

  function handleCancel() {
    navigate("/records?type=baptism");
  }

  async function handleDelete() {
    if (numericId == null) return;

    setError(null);
    setDeleting(true);
    const result = await deleteBaptismRecord(churchId, numericId);
    setDeleting(false);
    setDeleteConfirmOpen(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate("/records?type=baptism", {
      state: { recordsNotice: "Baptism record deleted." },
    });
  }

  if (!ready) {
    return (
      <PageLayout title={pageTitle} description="Loading…">
        <Text size="sm" c="dimmed">
          Checking session…
        </Text>
      </PageLayout>
    );
  }

  if (!editorReady) {
    return (
      <PageLayout
        title={pageTitle}
        description="Baptism editor is not available for this account or deployment."
      >
        <Stack gap="sm" maw={560}>
          <Alert color="orange" title="Editor unavailable">
            {authMode !== "live"
              ? "Live auth is required for the baptism editor."
              : churchId <= 0
                ? "Sign in with a parish account that has church context."
                : "Your role cannot manage sacramental records, or the baptism editor flag is off."}
          </Alert>
          <Button className="om-btn-ghost" variant="secondary" onAction={handleCancel}>
            Back to records
          </Button>
        </Stack>
      </PageLayout>
    );
  }

  if (mode === "edit" && numericId == null) {
    return (
      <PageLayout title={pageTitle} description="Invalid record link.">
        <Stack gap="sm" maw={560}>
          <Alert color="red" title="Invalid record">
            The baptism record id in this URL is not valid.
          </Alert>
          <Button className="om-btn-ghost" variant="secondary" onAction={handleCancel}>
            Back to records
          </Button>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={pageTitle}
      description="Sacramental baptism entry — saved through Orthodox Metrics REST APIs with parish-scoped church_id from your session."
      action={
        <Group gap="xs">
          {canDelete ? (
            <Button
              className="om-btn-destructive"
              variant="destructive"
              size="sm"
              isDisabled={loading || saving || deleting}
              onAction={() => setDeleteConfirmOpen(true)}
            >
              Delete record
            </Button>
          ) : null}
          <Button
            className="om-btn-ghost"
            variant="secondary"
            size="sm"
            isDisabled={saving || deleting}
            onAction={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="om-btn-primary"
            size="sm"
            isDisabled={loading || saving || deleting}
            onAction={() => void handleSave()}
          >
            {saving ? "Saving…" : mode === "create" ? "Create record" : "Save changes"}
          </Button>
        </Group>
      }
    >
      <Stack gap="md" maw={720}>
        {recordStatus ? (
          <Text size="sm" c="dimmed">
            Status: {recordStatus}
          </Text>
        ) : null}
        {loading ? (
          <Text size="sm" c="dimmed">
            Loading baptism record…
          </Text>
        ) : null}
        {loadError ? (
          <Alert color="red" title="Could not load record" role="alert">
            {loadError}
          </Alert>
        ) : null}
        {error ? (
          <Alert color="red" title="Could not save" role="alert">
            {error}
          </Alert>
        ) : null}
        {statusMessage ? (
          <Alert color="teal" title="Saved" role="status">
            {statusMessage}
          </Alert>
        ) : null}

        {!loading ? (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextField
                label="First name"
                value={form.first_name}
                onValueChange={(value) => updateField("first_name", value)}
                isRequired
              />
              <TextField
                label="Last name"
                value={form.last_name}
                onValueChange={(value) => updateField("last_name", value)}
                isRequired
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Birth date"
                type="date"
                value={form.birth_date}
                max={maxDate}
                onChange={(event) => updateField("birth_date", event.currentTarget.value)}
                required={mode === "create"}
              />
              <TextInput
                label="Reception / baptism date"
                type="date"
                value={form.reception_date}
                max={maxDate}
                onChange={(event) => updateField("reception_date", event.currentTarget.value)}
              />
            </SimpleGrid>

            <Autocomplete
              label="Clergy"
              placeholder={lookupsLoading ? "Loading clergy…" : "Select or type clergy name"}
              data={clergyOptions}
              value={form.clergy}
              onChange={(value) => updateField("clergy", value)}
              onOptionSubmit={(value) => updateField("clergy", value)}
              limit={20}
              required
            />

            <Autocomplete
              label="Birthplace"
              placeholder={lookupsLoading ? "Loading locations…" : "Select or type birthplace"}
              data={locationOptions}
              value={form.birthplace}
              onChange={(value) => updateField("birthplace", value)}
              onOptionSubmit={(value) => updateField("birthplace", value)}
              limit={20}
            />

            <Select
              label="Entry type"
              placeholder="Select entry type"
              data={[...BAPTISM_ENTRY_TYPE_OPTIONS]}
              value={
                normalizeBaptismEntryType(form.entry_type) || null
              }
              onChange={(value) => updateField("entry_type", value ?? "")}
              clearable
            />

            <TextField
              label="Parents"
              value={form.parents}
              onValueChange={(value) => updateField("parents", value)}
            />

            <TextField
              label="Sponsors / godparents"
              value={form.sponsors}
              onValueChange={(value) => updateField("sponsors", value)}
            />
          </Stack>
        ) : null}

        {mode === "edit" ? (
          <BaptismHistoryPanel
            churchId={churchId}
            recordId={numericId}
            refreshKey={historyRefreshKey}
          />
        ) : null}
      </Stack>

      <AlertDialog
        title="Delete baptism record?"
        description={`Permanently delete ${deleteTargetName}? This writes a delete event to audit history and cannot be undone.`}
        confirmLabel="Delete record"
        cancelLabel="Cancel"
        intent="destructive"
        isConfirmPending={deleting}
        isOpen={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteConfirmOpen(false);
        }}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteConfirmOpen(false);
        }}
      />
    </PageLayout>
  );
}
