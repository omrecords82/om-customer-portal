import { describe, expect, it } from "vitest";

import {
  buildBaptismRecordGetUrl,
  buildClergyLookupUrl,
  buildLocationsLookupUrl,
  unwrapLookupItems,
  unwrapSingleBaptismRecord,
} from "./baptismEditorApi";

describe("baptismEditorApi helpers", () => {
  it("builds tenant-scoped GET url with church_id query param", () => {
    expect(buildBaptismRecordGetUrl(12, 46)).toBe(
      "/api/baptism-records/12?church_id=46",
    );
  });

  it("builds clergy lookup url scoped to baptism record type", () => {
    const url = buildClergyLookupUrl(46, { search: "James" });
    expect(url).toContain("/api/lookup/clergy?");
    expect(url).toContain("church_id=46");
    expect(url).toContain("record_type=baptism");
    expect(url).toContain("search=James");
  });

  it("builds locations lookup url with church types", () => {
    const url = buildLocationsLookupUrl(46);
    expect(url).toContain("/api/lookup/locations?");
    expect(url).toContain("church_id=46");
    expect(url).toContain("types=Church%2COther");
  });

  it("unwraps lookup items from OM payload shape", () => {
    const items = unwrapLookupItems({
      items: [
        { value: "Fr. James", label: "Fr. James", source: "canonical" },
        { value: "Fr. Michael", label: "Fr. Michael" },
      ],
    });
    expect(items).toEqual([
      { value: "Fr. James", label: "Fr. James" },
      { value: "Fr. Michael", label: "Fr. Michael" },
    ]);
  });

  it("unwraps single baptism record from data envelope", () => {
    const row = unwrapSingleBaptismRecord({
      success: true,
      data: {
        id: 7,
        church_id: 46,
        first_name: "Anna",
        last_name: "Smith",
        birth_date: "2019-05-01",
        clergy: "Fr. James",
        status: "Recorded",
      },
    });
    expect(row?.id).toBe(7);
    expect(row?.first_name).toBe("Anna");
  });

  it("unwraps legacy active-status rows for editor load", () => {
    const row = unwrapSingleBaptismRecord({
      success: true,
      data: {
        id: 1049,
        churchId: "46",
        firstName: "James Mastrella",
        lastName: "Presti",
        dateOfBaptism: "3026-05-24",
        priest: "Rev. James Parsells",
        entryType: "Baptism",
        status: "active",
      },
    });
    expect(row?.id).toBe(1049);
    expect(row?.status).toBe("Recorded");
    expect(row?.reception_date).toBe("3026-05-24");
  });
});
