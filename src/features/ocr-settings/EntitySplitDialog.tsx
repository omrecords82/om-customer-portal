import { Checkbox, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Dialog } from "@om/ui/dialog";
import { TextField } from "@om/ui/text-field";
import { useEffect, useMemo, useState } from "react";

import type { OcrConfigEntity } from "./ocrSettingsApi";
import { parseClergyVariantsUi, type ClergyVariantCount } from "./ocrSettingsHelpers";

type EntitySplitDialogProps = {
  readonly isOpen: boolean;
  readonly entity: OcrConfigEntity | null;
  readonly entityLabel: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (variants: string[], canonicalValue: string) => Promise<void>;
};

export function EntitySplitDialog({
  isOpen,
  entity,
  entityLabel,
  onOpenChange,
  onConfirm,
}: EntitySplitDialogProps) {
  const variants = useMemo<ClergyVariantCount[]>(
    () => (entity ? parseClergyVariantsUi(entity.variants_json) : []),
    [entity],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [canonicalValue, setCanonicalValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !entity) return;
    const values = variants.map((v) => v.value);
    setSelected(values.length === 1 ? values : []);
    setCanonicalValue(values[0] ?? "");
  }, [entity, isOpen, variants]);

  async function submit() {
    if (!selected.length || !canonicalValue.trim()) return;
    setSubmitting(true);
    await onConfirm(selected, canonicalValue.trim());
    setSubmitting(false);
  }

  return (
    <Dialog title={`Split ${entityLabel} variants`} isOpen={isOpen} onOpenChange={onOpenChange}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select variant spellings to move into a new {entityLabel} entry. The source entry keeps remaining variants.
        </Text>
        {variants.length === 0 ? (
          <Text size="sm" c="dimmed">
            No variants available to split.
          </Text>
        ) : (
          variants.map((v) => (
            <Checkbox
              key={v.value}
              label={v.total ? `${v.value} (${String(v.total)})` : v.value}
              checked={selected.includes(v.value)}
              onChange={(e) => {
                setSelected((prev) =>
                  e.currentTarget.checked ? [...prev, v.value] : prev.filter((x) => x !== v.value),
                );
              }}
            />
          ))
        )}
        <TextField
          label="Canonical name for new entry"
          value={canonicalValue}
          onValueChange={setCanonicalValue}
          isRequired
        />
        <Stack gap="xs" align="flex-end">
          <Button className="om-btn-ghost" size="sm" variant="secondary" onAction={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="om-btn-primary"
            size="sm"
            isPending={submitting}
            isDisabled={!selected.length || !canonicalValue.trim()}
            onAction={() => void submit()}
          >
            Split selected
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}
