import { describe, expect, it } from "vitest";

import { normalizePortalBasePath } from "./basePath";

describe("normalizePortalBasePath", () => {
  it("defaults empty and root values to /", () => {
    expect(normalizePortalBasePath("")).toBe("/");
    expect(normalizePortalBasePath("   ")).toBe("/");
    expect(normalizePortalBasePath("/")).toBe("/");
  });

  it("normalizes leading and trailing slashes", () => {
    expect(normalizePortalBasePath("portal2")).toBe("/portal2");
    expect(normalizePortalBasePath("/portal2")).toBe("/portal2");
    expect(normalizePortalBasePath("/portal2/")).toBe("/portal2");
    expect(normalizePortalBasePath("  /portal2/  ")).toBe("/portal2");
  });
});
