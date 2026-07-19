import { describe, expect, it } from "vitest";

import {
  buildBaptismHistoryUrl,
  buildBaptismRecordDeleteUrl,
  unwrapBaptismHistory,
} from "./baptismEditorApi";
import {
  formatHistoryTimestamp,
  formatHistoryTypeLabel,
} from "./baptismEditorPresentation";

describe("baptismEditorApi history + delete helpers", () => {
  it("builds tenant-scoped history url", () => {
    expect(buildBaptismHistoryUrl(12, 46)).toBe(
      "/api/baptism-records/12/history?church_id=46",
    );
  });

  it("builds tenant-scoped delete url", () => {
    expect(buildBaptismRecordDeleteUrl(12, 46)).toBe(
      "/api/baptism-records/12?church_id=46",
    );
  });

  it("unwraps OM history payload newest-first order preserved", () => {
    const entries = unwrapBaptismHistory({
      success: true,
      history: [
        {
          id: 2,
          type: "update",
          description: "Updated clergy",
          timestamp: "2026-07-19T12:00:00.000Z",
          actor: "Fr. James",
          source: "ui",
          changedFields: ["clergy"],
        },
        {
          id: 1,
          type: "create",
          description: "Created baptism record",
          timestamp: "2026-07-18T09:00:00.000Z",
          actor: null,
          source: "ui",
        },
      ],
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.type).toBe("update");
    expect(entries[0]?.changedFields).toEqual(["clergy"]);
    expect(entries[1]?.actor).toBeNull();
  });

  it("returns empty history for malformed payloads", () => {
    expect(unwrapBaptismHistory(null)).toEqual([]);
    expect(unwrapBaptismHistory({ history: "nope" })).toEqual([]);
  });
});

describe("baptismEditorPresentation", () => {
  it("labels history event types", () => {
    expect(formatHistoryTypeLabel("create")).toBe("Created");
    expect(formatHistoryTypeLabel("delete")).toBe("Deleted");
    expect(formatHistoryTypeLabel("custom")).toBe("custom");
  });

  it("formats timestamps when parseable", () => {
    const formatted = formatHistoryTimestamp("2026-07-19T12:00:00.000Z");
    expect(formatted).not.toBe("—");
    expect(formatHistoryTimestamp("")).toBe("—");
  });
});
