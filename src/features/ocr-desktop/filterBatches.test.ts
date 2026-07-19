import { describe, expect, it } from "vitest";

import { filterBatches } from "./filterBatches";
import type { Batch } from "./types";

const SAMPLES: Batch[] = [
  {
    id: "1",
    name: "Baptism register",
    recordType: "Baptism",
    submitted: "2026-07-01",
    pages: 10,
    records: 20,
    mode: "standard",
    status: "completed",
    needsReview: 0,
  },
  {
    id: "2",
    name: "Marriage ledger",
    recordType: "Marriage",
    submitted: "2026-07-02",
    pages: 5,
    records: 8,
    mode: "autoseed",
    status: "processing",
    needsReview: 0,
  },
];

describe("filterBatches", () => {
  it("filters by query against name and record type", () => {
    expect(filterBatches(SAMPLES, { query: "baptism", status: "all" })).toHaveLength(1);
    expect(filterBatches(SAMPLES, { query: "marriage", status: "all" })[0]?.id).toBe("2");
  });

  it("filters by status", () => {
    expect(filterBatches(SAMPLES, { query: "", status: "processing" })).toHaveLength(1);
    expect(filterBatches(SAMPLES, { query: "", status: "failed" })).toHaveLength(0);
  });
});
