import type { TokenPath } from "@om/contracts";
import {
  hasTokenPath,
  tokenPathToCssCustomProperty,
} from "@om/tokens";

/** Published @om/tokens paths bridged to OM navy/gold in `brand-bridge.css`. */
export const BRIDGED_OM_TOKEN_PATHS = [
  "component.navigation.activeIndicator",
  "component.header.accent",
  "component.footer.accent",
  "semantic.focus.ring",
] as const satisfies readonly TokenPath[];

/** Portal-local CSS vars awaiting brand-pack publication in @om/tokens. */
export const DEFERRED_BRAND_CSS_VARS = [
  "--om-brand-navy-0",
  "--om-brand-navy-7",
  "--om-brand-navy-8",
  "--om-brand-navy-9",
  "--om-brand-gold-5",
  "--om-brand-gold-6",
  "--om-sidebar-bg",
  "--om-sidebar-border",
  "--om-sidebar-surface",
  "--om-sidebar-text",
  "--om-sidebar-text-hover",
  "--om-sidebar-text-muted",
  "--om-sidebar-text-faint",
  "--om-sidebar-accent",
] as const;

export type BridgedOmTokenPath = (typeof BRIDGED_OM_TOKEN_PATHS)[number];
export type DeferredBrandCssVar = (typeof DEFERRED_BRAND_CSS_VARS)[number];

export function bridgedTokenCssVar(path: BridgedOmTokenPath): string {
  if (!hasTokenPath(path)) {
    throw new Error(`Expected published @om/tokens path: ${path}`);
  }
  return tokenPathToCssCustomProperty(path);
}
