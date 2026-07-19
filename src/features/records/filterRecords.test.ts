import { describe, expect, it } from "vitest";

import { MOCK_RECORDS, filterRecords } from "./recordsData";

describe("filterRecords", () => {
  it("filters by type and query", () => {
    expect(filterRecords(MOCK_RECORDS, { query: "", type: "baptism" })).toHaveLength(2);
    expect(
      filterRecords(MOCK_RECORDS, { query: "ivanova", type: "all" })[0]?.id,
    ).toBe("r2");
  });
});
