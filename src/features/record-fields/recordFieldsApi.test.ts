import { describe, expect, it } from "vitest";

import {
  buildRecordFieldSavePayload,
  parseRecordFieldsResponse,
  PROTECTED_FIELD_KEYS,
  reorderFieldRows,
  type RecordFieldRow,
} from "./recordFieldsApi";

const SAMPLE_ROWS: RecordFieldRow[] = [
  {
    key: "first_name",
    label: "First",
    headerLabel: "FIRST",
    required: true,
    visible: true,
    sortOrder: 0,
  },
  {
    key: "last_name",
    label: "Last",
    headerLabel: "LAST",
    required: true,
    visible: true,
    sortOrder: 1,
  },
];

describe("recordFieldsApi helpers", () => {
  it("parses record fields API response", () => {
    const config = parseRecordFieldsResponse({
      fields: {
        baptism: [
          {
            key: "child_first_name",
            label: "First Name",
            headerLabel: "FIRST NAME",
            required: true,
            visible: true,
            sortOrder: 0,
          },
        ],
      },
    });
    expect(config.baptism?.[0]?.key).toBe("child_first_name");
  });

  it("reorders field rows", () => {
    const next = reorderFieldRows(SAMPLE_ROWS, 0, 1);
    expect(next[0]?.key).toBe("last_name");
    expect(next[1]?.key).toBe("first_name");
  });

  it("builds save payload with sequential sortOrder", () => {
    const payload = buildRecordFieldSavePayload({ baptism: SAMPLE_ROWS });
    expect(payload.baptism?.[1]?.sortOrder).toBe(1);
  });

  it("marks protected identity columns", () => {
    expect(PROTECTED_FIELD_KEYS.has("id")).toBe(true);
    expect(PROTECTED_FIELD_KEYS.has("child_first_name")).toBe(false);
  });
});
