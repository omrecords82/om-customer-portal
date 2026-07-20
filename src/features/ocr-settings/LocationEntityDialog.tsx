import { Select, Stack, Textarea } from "@mantine/core";
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
  buildLocationEntityPayload,
  defaultLocationForm,
  locationFormFromEntity,
  LOCATION_TYPE_OPTIONS,
  type LocationFormState,
} from "./ocrSettingsHelpers";

type LocationEntityDialogProps = {
  readonly churchId: number;
  readonly isOpen: boolean;
  readonly entity: OcrConfigEntity | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => void;
  readonly onError: (message: string) => void;
};

export function LocationEntityDialog({
  churchId,
  isOpen,
  entity,
  onOpenChange,
  onSaved,
  onError,
}: LocationEntityDialogProps) {
  const [form, setForm] = useState<LocationFormState>(defaultLocationForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(entity ? locationFormFromEntity(entity) : defaultLocationForm());
  }, [entity, isOpen]);

  async function save() {
    if (!form.canonical_value.trim()) {
      onError("Canonical name is required.");
      return;
    }
    setSaving(true);
    const payload = buildLocationEntityPayload(form, entity);
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
      title={entity ? "Edit known location" : "Add known location"}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Stack gap="md">
        <Select
          label="Location type"
          data={LOCATION_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
          value={form.location_type}
          onChange={(v) => setForm((f) => ({ ...f, location_type: v ?? "Other" }))}
        />
        <TextField
          label="Canonical name"
          value={form.canonical_value}
          onValueChange={(v) => setForm((f) => ({ ...f, canonical_value: v }))}
          isRequired
        />
        <TextField
          label="Display label"
          value={form.display_label}
          onValueChange={(v) => setForm((f) => ({ ...f, display_label: v }))}
        />
        <TextField
          label="Street address"
          value={form.street_address}
          onValueChange={(v) => setForm((f) => ({ ...f, street_address: v }))}
        />
        <Stack gap="sm">
          <TextField
            label="City"
            value={form.city}
            onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}
          />
          <TextField
            label="State / province"
            value={form.state_province}
            onValueChange={(v) => setForm((f) => ({ ...f, state_province: v }))}
          />
        </Stack>
        <Stack gap="sm">
          <TextField
            label="Postal code"
            value={form.postal_code}
            onValueChange={(v) => setForm((f) => ({ ...f, postal_code: v }))}
          />
          <TextField
            label="Country"
            value={form.country}
            onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}
          />
        </Stack>
        <Textarea
          label="Spelling variants"
          description="Comma-separated burial location spellings from funeral records."
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
      </Stack>
    </Dialog>
  );
}
