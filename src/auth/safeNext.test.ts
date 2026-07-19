import { describe, expect, it } from "vitest";

import { getSafePortalNext, toAbsolutePortalPath } from "./safeNext";

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
});

describe("toAbsolutePortalPath", () => {
  it("prefixes the configured basename", () => {
    expect(toAbsolutePortalPath("/")).toMatch(/portal2|\/$/);
    expect(toAbsolutePortalPath("/ocr")).toContain("/ocr");
  });
});
