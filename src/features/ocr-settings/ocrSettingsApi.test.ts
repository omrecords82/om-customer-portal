import { describe, expect, it } from "vitest";

import { normalizeClergyRow, parseClergyFile } from "./clergyImport";
import {
  buildClergyEntityPayload,
  clergyDateForApi,
  clergyFormFromEntity,
  defaultClergyForm,
  isTenantDefaultLocation,
  parseVariantsFromFormString,
  variantsToFormString,
} from "./ocrSettingsHelpers";
import {
  buildRulePayloadFromTemplate,
  defaultOcrChurchSettings,
  isSystemRule,
  parseClergyVariants,
  parseOcrChurchSettings,
  type OcrConfigEntity,
  type OcrParishRule,
} from "./ocrSettingsApi";

describe("ocrSettingsApi helpers", () => {
  it("parses OCR church settings payload", () => {
    const settings = parseOcrChurchSettings({
      useRecordSnippets: false,
      documentProcessing: {
        spellingCorrection: "exact",
        extractAllText: "no",
        improveFormatting: "yes",
        recordLayoutMode: "ledger",
        extractionAgentMode: "agent2_only",
      },
      documentDeletion: { deleteAfter: 14, deleteUnit: "days" },
    });
    expect(settings.useRecordSnippets).toBe(false);
    expect(settings.documentProcessing.recordLayoutMode).toBe("ledger");
    expect(settings.documentDeletion.deleteAfter).toBe(14);
  });

  it("falls back to defaults for malformed payload", () => {
    expect(parseOcrChurchSettings(null)).toEqual(defaultOcrChurchSettings());
  });

  it("identifies system vs parish rules", () => {
    const system: OcrParishRule = {
      id: 1,
      church_id: null,
      scope: "global",
      name: "System",
      description: null,
      record_type: "all",
      severity: "blocker",
      priority: 1,
      is_active: true,
    };
    const parish: OcrParishRule = { ...system, id: 2, church_id: 46, scope: "church" };
    expect(isSystemRule(system)).toBe(true);
    expect(isSystemRule(parish)).toBe(false);
  });

  it("parses clergy variant JSON", () => {
    expect(parseClergyVariants([{ value: "Fr. James", count: 12 }])).toEqual([
      { value: "Fr. James", count: 12 },
    ]);
  });

  it("builds default-value rule payload from template", () => {
    const built = buildRulePayloadFromTemplate({
      name: "Default clergy",
      description: "",
      record_type: "baptism",
      severity: "suggestion",
      priority: 50,
      rule_template: "default_value",
      condition_field: "",
      action_field: "clergy",
      action_value: "Unknown",
    });
    expect(built).not.toBeNull();
    expect(built?.conditions_json).toEqual({ all: [{ field: "clergy", operator: "is_empty" }] });
  });
});

describe("ocrSettingsHelpers", () => {
  it("formats clergy dates for API", () => {
    expect(clergyDateForApi("2010-05-01T00:00:00.000Z")).toBe("2010-05-01");
    expect(clergyDateForApi("")).toBeNull();
  });

  it("builds clergy entity payload with current tenure", () => {
    const payload = buildClergyEntityPayload({
      ...defaultClergyForm(),
      canonical_value: "Fr. John",
      is_current: true,
      variants_json: "Fr. John, Fr J.",
    });
    expect(payload.canonical_value).toBe("Fr. John");
    expect(payload.active_to).toBeNull();
    expect(payload.variants_json).toEqual(["Fr. John", "Fr J."]);
  });

  it("maps entity to clergy form", () => {
    const entity: OcrConfigEntity = {
      id: 1,
      entity_type: "clergy",
      canonical_value: "Fr. Paul",
      role: "Rector",
      active_from: "2000-01-01",
      active_to: null,
      variants_json: [{ value: "Fr Paul", count: 3 }],
    };
    const form = clergyFormFromEntity(entity);
    expect(form.is_current).toBe(true);
    expect(form.variants_json).toBe("Fr Paul");
  });

  it("detects tenant default locations", () => {
    const entity: OcrConfigEntity = {
      id: 2,
      entity_type: "location",
      canonical_value: "St. Nicholas Church",
      metadata_json: { tenant_default: true },
    };
    expect(isTenantDefaultLocation(entity)).toBe(true);
  });

  it("parses variant form strings", () => {
    expect(parseVariantsFromFormString("A, B ,C")).toEqual(["A", "B", "C"]);
    expect(variantsToFormString([{ value: "A", total: 1 }])).toBe("A");
  });
});

describe("clergyImport", () => {
  it("normalizes clergy rows", () => {
    const row = normalizeClergyRow({ name: "Fr. Andrew", role: "Priest" });
    expect(row?.canonical_value).toBe("Fr. Andrew");
    expect(row?.role).toBe("Priest");
  });

  it("parses CSV files", async () => {
    const file = new File(
      ["canonical_value,role\nFr. Test,Rector\n"],
      "clergy.csv",
      { type: "text/csv" },
    );
    const rows = await parseClergyFile(file, true, "Rector");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.canonical_value).toBe("Fr. Test");
  });
});
