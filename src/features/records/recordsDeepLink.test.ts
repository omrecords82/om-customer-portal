import { describe, expect, it } from "vitest";

import { getSafePortalNext, loginPathWithNext } from "../../auth/safeNext";
import {
  buildRecordsSearch,
  normalizeRecordsTypeParam,
  parseRecordsDeepLink,
} from "./recordsDeepLink";

describe("normalizeRecordsTypeParam", () => {
  it("maps canonical and alias types", () => {
    expect(normalizeRecordsTypeParam("baptism")).toBe("baptism");
    expect(normalizeRecordsTypeParam("Baptisms")).toBe("baptism");
    expect(normalizeRecordsTypeParam("wedding")).toBe("marriage");
    expect(normalizeRecordsTypeParam("burials")).toBe("funeral");
    expect(normalizeRecordsTypeParam("confirmation")).toBe("chrismation");
  });

  it("falls back to all for unknown or empty values", () => {
    expect(normalizeRecordsTypeParam("not-a-type")).toBe("all");
    expect(normalizeRecordsTypeParam("")).toBe("all");
    expect(normalizeRecordsTypeParam(null)).toBe("all");
  });
});

describe("parseRecordsDeepLink", () => {
  it("parses type, recordId, churchId and preserves extras", () => {
    const params = new URLSearchParams(
      "type=baptism&recordId=123&churchId=46&view=table&source=email",
    );
    expect(parseRecordsDeepLink(params)).toEqual({
      typeFilter: "baptism",
      canonicalType: "baptism",
      recordId: "123",
      churchId: 46,
      extras: { view: "table", source: "email" },
    });
  });

  it("normalizes aliases and rejects invalid ids", () => {
    const params = new URLSearchParams("type=weddings&recordId=abc&churchId=xyz");
    expect(parseRecordsDeepLink(params)).toEqual({
      typeFilter: "marriage",
      canonicalType: "marriage",
      recordId: null,
      churchId: null,
      extras: {},
    });
  });

  it("unknown type → all filter (not an error)", () => {
    expect(parseRecordsDeepLink(new URLSearchParams("type=foo")).typeFilter).toBe(
      "all",
    );
  });
});

describe("buildRecordsSearch", () => {
  it("omits type when all and preserves extras", () => {
    expect(buildRecordsSearch({ typeFilter: "all", extras: { q: "ivan" } })).toBe(
      "?q=ivan",
    );
    expect(
      buildRecordsSearch({
        typeFilter: "funeral",
        recordId: "9",
        churchId: 1,
      }),
    ).toBe("?type=funeral&recordId=9&churchId=1");
  });
});

describe("records deep link × auth next= round-trip", () => {
  it("parseRecordsDeepLink still works after login next= encode/decode", () => {
    const appPath = "/records?type=baptism&recordId=42";
    const loginSearch = loginPathWithNext(appPath).split("?")[1] ?? "";
    const restored = getSafePortalNext(loginSearch);
    expect(restored).toBe(appPath);

    const qIndex = restored.indexOf("?");
    const search = qIndex >= 0 ? restored.slice(qIndex + 1) : "";
    expect(parseRecordsDeepLink(new URLSearchParams(search))).toEqual({
      typeFilter: "baptism",
      canonicalType: "baptism",
      recordId: "42",
      churchId: null,
      extras: {},
    });
  });
});
