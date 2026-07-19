import { describe, expect, it } from "vitest";

import { normalizePortalBasePath } from "./basePath";

describe("normalizePortalBasePath", () => {
  it("defaults empty and root values to /", () => {
    expect(normalizePortalBasePath("")).toBe("/");
    expect(normalizePortalBasePath("   ")).toBe("/");
    expect(normalizePortalBasePath("/")).toBe("/");
  });

  it("normalizes leading and trailing slashes", () => {
    expect(normalizePortalBasePath("portal")).toBe("/portal");
    expect(normalizePortalBasePath("/portal")).toBe("/portal");
    expect(normalizePortalBasePath("/portal/")).toBe("/portal");
    expect(normalizePortalBasePath("  /portal/  ")).toBe("/portal");
  });
});
