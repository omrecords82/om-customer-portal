import { describe, expect, it } from "vitest";

import {
  DEFAULT_RECORDS_EDITOR_FLAGS,
  buildLegacyRecordsEditorUrl,
  buildRecordsEditorRoute,
  canManageRecords,
  canNavigateToRecordsEditor,
  canShowRecordsEditor,
  countEnabledRecordsEditors,
  describeRecordsEditorGateStatus,
  hasDualRunPilotConflict,
  isRecordsEditorFlagEnabled,
  isRecordsEditorReady,
  listEnabledRecordsEditorTypes,
  resolveRecordsEditorFlags,
} from "./recordsEditorFlags";

describe("recordsEditorFlags", () => {
  it("defaults all per-type flags off", () => {
    expect(DEFAULT_RECORDS_EDITOR_FLAGS).toEqual({
      baptismEnabled: false,
      marriageEnabled: false,
      funeralEnabled: false,
    });
    expect(resolveRecordsEditorFlags()).toEqual(DEFAULT_RECORDS_EDITOR_FLAGS);
    expect(countEnabledRecordsEditors(DEFAULT_RECORDS_EDITOR_FLAGS)).toBe(0);
    expect(listEnabledRecordsEditorTypes(DEFAULT_RECORDS_EDITOR_FLAGS)).toEqual([]);
  });

  it("applies env and church overrides without hard-coding church ids", () => {
    const flags = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true },
      churchOverrides: { marriageEnabled: true },
    });
    expect(flags.baptismEnabled).toBe(true);
    expect(flags.marriageEnabled).toBe(true);
    expect(flags.funeralEnabled).toBe(false);
  });

  it("detects dual-run pilot conflict when more than one type is enabled", () => {
    const flags = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true, marriageEnabled: true },
    });
    expect(hasDualRunPilotConflict(flags)).toBe(true);
    expect(canShowRecordsEditor(flags, "baptism")).toBe(false);
    expect(canShowRecordsEditor(flags, "marriage")).toBe(false);
  });

  it("allows canShowRecordsEditor when a single type flag is on", () => {
    const flags = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true },
    });
    expect(isRecordsEditorFlagEnabled(flags, "baptism")).toBe(true);
    expect(canShowRecordsEditor(flags, "baptism")).toBe(true);
    expect(canShowRecordsEditor(flags, "marriage")).toBe(false);
  });

  it("requires live auth, church context, and deacon+ role for readiness", () => {
    const flags = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true },
    });
    const base = { flags, type: "baptism" as const };

    expect(isRecordsEditorReady(base)).toBe(false);
    expect(
      isRecordsEditorReady({
        ...base,
        authMode: "live",
        churchId: 12,
        role: "deacon",
      }),
    ).toBe(true);
    expect(
      isRecordsEditorReady({
        ...base,
        authMode: "live",
        churchId: 12,
        role: "viewer",
      }),
    ).toBe(false);
    expect(canManageRecords("priest")).toBe(true);
    expect(canManageRecords("editor")).toBe(false);
  });

  it("blocks navigation until editor UI ships even when readiness passes", () => {
    const flags = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true },
    });
    const input = {
      flags,
      type: "baptism" as const,
      authMode: "live" as const,
      churchId: 3,
      role: "church_admin",
    };
    expect(isRecordsEditorReady(input)).toBe(true);
    expect(canNavigateToRecordsEditor(input)).toBe(false);
    expect(canNavigateToRecordsEditor({ ...input, editorsUiShipped: true })).toBe(
      true,
    );
  });

  it("builds future editor routes and legacy fallback URLs", () => {
    expect(buildRecordsEditorRoute("baptism")).toBe("/records/baptism/new");
    expect(buildRecordsEditorRoute("marriage", { recordId: 9 })).toBe(
      "/records/marriage/9/edit",
    );
    expect(buildLegacyRecordsEditorUrl("funeral")).toBe(
      "/portal/records?type=funeral",
    );
  });

  it("describes gate status for operators", () => {
    expect(describeRecordsEditorGateStatus(DEFAULT_RECORDS_EDITOR_FLAGS)).toContain(
      "dual-run gated",
    );
    const single = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true },
    });
    expect(describeRecordsEditorGateStatus(single)).toContain("not shipped yet");
    const conflict = resolveRecordsEditorFlags({
      envOverrides: { baptismEnabled: true, funeralEnabled: true },
    });
    expect(describeRecordsEditorGateStatus(conflict)).toContain(
      "one type at a time",
    );
  });
});
