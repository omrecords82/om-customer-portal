import { describe, expect, it } from "vitest";
import {
  BRIDGED_OM_TOKEN_PATHS,
  DEFERRED_BRAND_CSS_VARS,
  bridgedTokenCssVar,
} from "./brandTokens";

describe("brandTokens (Wave J bridge)", () => {
  it("bridges only published @om/tokens paths", () => {
    for (const path of BRIDGED_OM_TOKEN_PATHS) {
      expect(bridgedTokenCssVar(path)).toMatch(/^--om-/);
    }
  });

  it("documents deferred portal-local brand vars", () => {
    expect(DEFERRED_BRAND_CSS_VARS).toContain("--om-sidebar-bg");
    expect(DEFERRED_BRAND_CSS_VARS).toContain("--om-brand-navy-7");
    expect(DEFERRED_BRAND_CSS_VARS.length).toBeGreaterThanOrEqual(10);
  });

  it("maps navigation active indicator to the sidebar accent chain", () => {
    expect(bridgedTokenCssVar("component.navigation.activeIndicator")).toBe(
      "--om-component-navigation-active-indicator",
    );
  });
});
