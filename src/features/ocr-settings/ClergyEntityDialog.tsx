import { Checkbox, Select, Stack, Text, Textarea } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Dialog } from "@om/ui/dialog";
import { TextField } from "@om/ui/text-field";
import { useEffect, useState } from "react";

import {
  createOcrConfigEntity,
  patchOcrConfigEntity,
  type OcrConfigEntity,
} from "./ocrSettingsApi";
import {
  buildClergyEntityPayload,
  CLERGY_ROLE_OPTIONS,
  clergyFormFromEntity,
  defaultClergyForm,
  type ClergyFormState,
} from "./ocrSettingsHelpers";

type ClergyEntityDialogProps = {
  readonly churchId: number;
  readonly isOpen: boolean;
  readonly entity: OcrConfigEntity | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => void;
  readonly onError: (message: string) => void;
};

export function ClergyEntityDialog({
  churchId,
  isOpen,
  entity,
  onOpenChange,
  onSaved,
  onError,
}: ClergyEntityDialogProps) {
  const [form, setForm] = useState<ClergyFormState>(defaultClergyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(entity ? clergyFormFromEntity(entity) : defaultClergyForm());
  }, [entity, isOpen]);

  async function save() {
    if (!form.canonical_value.trim()) {
      onError("Canonical name is required.");
      return;
    }
    setSaving(true);
    const payload = buildClergyEntityPayload(form);
    const result = entity
      ? await patchOcrConfigEntity(churchId, entity.id, payload)
      : await createOcrConfigEntity(churchId, payload);
    setSaving(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog
      title={entity ? "Edit clergy tenure" : "Add clergy tenure"}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Stack gap="md">
        <TextField
          label="Canonical name"
          value={form.canonical_value}
          onValueChange={(v) => setForm((f) => ({ ...f, canonical_value: v }))}
          isRequired
        />
        <Select
          label="Role"
          data={CLERGY_ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
          value={form.role}
          onChange={(v) => setForm((f) => ({ ...f, role: v ?? "Rector" }))}
        />
        <TextField
          label="Active from"
          placeholder="YYYY-MM-DD"
          value={form.active_from}
          onValueChange={(v) => setForm((f) => ({ ...f, active_from: v }))}
        />
        <Checkbox
          label="Current (no end date)"
          checked={form.is_current}
          onChange={(e) => setForm((f) => ({ ...f, is_current: e.currentTarget.checked }))}
        />
        {!form.is_current ? (
          <TextField
            label="Active to"
            placeholder="YYYY-MM-DD"
            value={form.active_to}
            onValueChange={(v) => setForm((f) => ({ ...f, active_to: v }))}
          />
        ) : null}
        <Textarea
          label="Spelling variants"
          description="Comma-separated observed spellings from records."
          value={form.variants_json}
          onChange={(e) => setForm((f) => ({ ...f, variants_json: e.currentTarget.value }))}
          minRows={2}
        />
        <Textarea
          label="Source notes"
          value={form.source_notes}
          onChange={(e) => setForm((f) => ({ ...f, source_notes: e.currentTarget.value }))}
          minRows={2}
        />
        <Stack gap="xs" align="flex-end">
          <Button className="om-btn-ghost" size="sm" variant="secondary" onAction={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="om-btn-primary"
            size="sm"
            isPending={saving}
            isDisabled={!form.canonical_value.trim()}
            onAction={() => void save()}
          >
            Save
          </Button>
        </Stack>
        <Text size="xs" c="dimmed">
          Tenure dates help OCR match officiants to the correct service period.
        </Text>
      </Stack>
    </Dialog>
  );
}
