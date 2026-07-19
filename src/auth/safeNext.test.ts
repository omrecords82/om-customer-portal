import { describe, expect, it } from "vitest";

import {
  buildPortalReturnPath,
  getSafePortalNext,
  loginPathWithNext,
  toAbsolutePortalPath,
} from "./safeNext";

describe("getSafePortalNext", () => {
  it("returns fallback when next is missing or unsafe", () => {
    expect(getSafePortalNext("")).toBe("/");
    expect(getSafePortalNext("next=https://evil.example")).toBe("/");
    expect(getSafePortalNext("next=//evil.example")).toBe("/");
  });

  it("accepts app-relative paths and strips /portal2 basename", () => {
    expect(getSafePortalNext("next=%2Focr")).toBe("/ocr");
    expect(getSafePortalNext("next=%2Fportal2%2Faccount")).toBe("/account");
  });

  it("preserves nested records deep-link query (RequireAuth redirect shape)", () => {
    const nested = "/records?type=baptism";
    const loginSearch = loginPathWithNext(nested).split("?")[1] ?? "";
    expect(getSafePortalNext(loginSearch)).toBe(nested);

    // Basename-prefixed browser URL (apiFetch 401 path)
    const withBase = "/portal2/records?type=baptism";
    const fromBrowser = `next=${encodeURIComponent(withBase)}`;
    expect(getSafePortalNext(fromBrowser)).toBe(nested);
  });

  it("preserves search + hash on nested paths", () => {
    const nested = "/records?type=marriage&recordId=9#row";
    expect(getSafePortalNext(`next=${encodeURIComponent(nested)}`)).toBe(nested);
  });
});

describe("buildPortalReturnPath / loginPathWithNext", () => {
  it("joins pathname, search, and hash like RequireAuth", () => {
    expect(
      buildPortalReturnPath({
        pathname: "/records",
        search: "?type=baptism",
        hash: "",
      }),
    ).toBe("/records?type=baptism");

    expect(loginPathWithNext("/records?type=baptism")).toBe(
      `/auth/login?next=${encodeURIComponent("/records?type=baptism")}`,
    );
  });
});

describe("toAbsolutePortalPath", () => {
  it("prefixes the configured basename", () => {
    expect(toAbsolutePortalPath("/")).toMatch(/portal2|\/$/);
    expect(toAbsolutePortalPath("/ocr")).toContain("/ocr");
  });
});
