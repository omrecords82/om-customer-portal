import { NumberInput, Select, Stack, Textarea } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Dialog } from "@om/ui/dialog";
import { TextField } from "@om/ui/text-field";
import { useEffect, useState } from "react";

import {
  buildRulePayloadFromTemplate,
  createOcrRule,
  patchOcrRule,
  type OcrParishRule,
  type OcrRuleSeverity,
  type RuleTemplateKey,
} from "./ocrSettingsApi";

const RULE_TEMPLATES: { readonly key: RuleTemplateKey; readonly label: string }[] = [
  { key: "default_value", label: "Default value when empty" },
  { key: "validate_not_empty", label: "Require field is not empty" },
  { key: "validate_format", label: "Validate field format (regex)" },
];

type RuleFormState = {
  name: string;
  description: string;
  record_type: string;
  severity: OcrRuleSeverity;
  priority: number;
  rule_template: RuleTemplateKey;
  condition_field: string;
  action_field: string;
  action_value: string;
};

function defaultRuleForm(): RuleFormState {
  return {
    name: "",
    description: "",
    record_type: "baptism",
    severity: "suggestion",
    priority: 50,
    rule_template: "default_value",
    condition_field: "",
    action_field: "",
    action_value: "",
  };
}

type RuleEditorDialogProps = {
  readonly churchId: number;
  readonly isOpen: boolean;
  readonly rule: OcrParishRule | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => void;
  readonly onError: (message: string) => void;
};

export function RuleEditorDialog({
  churchId,
  isOpen,
  rule,
  onOpenChange,
  onSaved,
  onError,
}: RuleEditorDialogProps) {
  const [form, setForm] = useState<RuleFormState>(defaultRuleForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (rule) {
      setForm({
        name: rule.name,
        description: rule.description ?? "",
        record_type: rule.record_type,
        severity: rule.severity,
        priority: rule.priority,
        rule_template: "default_value",
        condition_field: "",
        action_field: "",
        action_value: "",
      });
    } else {
      setForm(defaultRuleForm());
    }
  }, [isOpen, rule]);

  async function save() {
    if (!form.name.trim()) {
      onError("Rule name is required.");
      return;
    }
    setSaving(true);
    if (rule) {
      const result = await patchOcrRule(churchId, rule.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        record_type: form.record_type,
        severity: form.severity,
        priority: form.priority,
      });
      setSaving(false);
      if (!result.ok) {
        onError(result.message);
        return;
      }
    } else {
      const built = buildRulePayloadFromTemplate(form);
      if (!built) {
        setSaving(false);
        onError("Unknown rule template.");
        return;
      }
      const result = await createOcrRule(churchId, {
        name: form.name.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        record_type: form.record_type,
        severity: form.severity,
        priority: form.priority,
        conditions_json: built.conditions_json,
        actions_json: built.actions_json,
      });
      setSaving(false);
      if (!result.ok) {
        onError(result.message);
        return;
      }
    }
    onOpenChange(false);
    onSaved();
  }

  const editing = rule != null;

  return (
    <Dialog title={editing ? "Edit parish rule" : "Add parish rule"} isOpen={isOpen} onOpenChange={onOpenChange}>
      <Stack gap="md">
        <TextField
          label="Name"
          value={form.name}
          onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
          isRequired
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.currentTarget.value }))}
          minRows={2}
        />
        <Select
          label="Record type"
          data={[
            { value: "baptism", label: "Baptism" },
            { value: "marriage", label: "Marriage" },
            { value: "funeral", label: "Funeral" },
            { value: "all", label: "All" },
          ]}
          value={form.record_type}
          onChange={(v) => setForm((f) => ({ ...f, record_type: v ?? "baptism" }))}
        />
        <Select
          label="Severity"
          data={[
            { value: "suggestion", label: "Suggestion" },
            { value: "warning", label: "Warning" },
            { value: "blocker", label: "Blocker" },
          ]}
          value={form.severity}
          onChange={(v) => setForm((f) => ({ ...f, severity: (v ?? "suggestion") as OcrRuleSeverity }))}
        />
        <NumberInput
          label="Priority"
          value={form.priority}
          min={1}
          max={999}
          onChange={(v) => setForm((f) => ({ ...f, priority: Number(v) || 50 }))}
        />
        {!editing ? (
          <>
            <Select
              label="Rule template"
              data={RULE_TEMPLATES.map((t) => ({ value: t.key, label: t.label }))}
              value={form.rule_template}
              onChange={(v) =>
                setForm((f) => ({ ...f, rule_template: (v ?? "default_value") as RuleTemplateKey }))
              }
            />
            {form.rule_template === "default_value" ? (
              <>
                <TextField
                  label="Target field"
                  value={form.action_field}
                  onValueChange={(v) => setForm((f) => ({ ...f, action_field: v }))}
                />
                <TextField
                  label="Default value"
                  value={form.action_value}
                  onValueChange={(v) => setForm((f) => ({ ...f, action_value: v }))}
                />
              </>
            ) : (
              <>
                <TextField
                  label="Field to validate"
                  value={form.condition_field}
                  onValueChange={(v) => setForm((f) => ({ ...f, condition_field: v }))}
                />
                {form.rule_template === "validate_format" ? (
                  <TextField
                    label="Regex pattern"
                    value={form.action_value}
                    onValueChange={(v) => setForm((f) => ({ ...f, action_value: v }))}
                  />
                ) : null}
              </>
            )}
          </>
        ) : null}
        <Stack gap="xs" align="flex-end">
          <Button className="om-btn-ghost" size="sm" variant="secondary" onAction={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="om-btn-primary"
            size="sm"
            isPending={saving}
            isDisabled={!form.name.trim()}
            onAction={() => void save()}
          >
            {editing ? "Save changes" : "Create rule"}
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}
