import { describe, expect, it } from "vitest";

import {
  defaultOcrChurchSettings,
  isSystemRule,
  parseClergyVariants,
  parseOcrChurchSettings,
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
});
