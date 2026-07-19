import { describe, expect, it } from "vitest";
import { getNavItem, PORTAL_NAV, PAGE_TITLES } from "./navConfig";

describe("navConfig", () => {
  it("includes blueprint OCR and onboarding routes", () => {
    expect(getNavItem("/ocr")?.title).toBe("OCR Desktop");
    expect(getNavItem("/ocr/mobile")?.title).toBe("OCR Mobile");
    expect(getNavItem("/onboarding")?.title).toBe("Portal Onboarding");
  });

  it("keeps sidebar items and page titles aligned", () => {
    for (const item of PORTAL_NAV) {
      expect(PAGE_TITLES[item.href]).toBe(item.title);
    }
    expect(PORTAL_NAV.some((item) => item.href === "/account" && item.showInSidebar === false)).toBe(
      true,
    );
  });
});
