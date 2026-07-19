import type { FetchParishResult } from "../features/settings/settingsApi";
import { DEFAULT_PARISH, type ParishProfile } from "../features/settings/settingsData";

export type ParishChromeSource = "preview" | "live" | "fallback";

export type ParishChromeSnapshot = {
  readonly profile: ParishProfile;
  readonly source: ParishChromeSource;
  readonly error: string | null;
};

/** User-facing note when shell chrome is not live-backed. */
export function parishChromeNote(
  source: ParishChromeSource,
  error: string | null,
): string | null {
  if (source === "preview") {
    return "Preview parish identity — live church settings load when VITE_PORTAL_AUTH_MODE=live with auth.";
  }
  if (source === "fallback") {
    return error
      ? `${error} Showing preview parish defaults.`
      : "Could not load live parish settings. Showing preview defaults.";
  }
  return null;
}

/** Map settings API result into shell chrome state (testable without React). */
export function parishChromeFromFetchResult(
  liveEligible: boolean,
  result: FetchParishResult,
): ParishChromeSnapshot {
  if (!liveEligible) {
    return { profile: DEFAULT_PARISH, source: "preview", error: null };
  }
  if (result.ok) {
    return {
      profile: result.profile,
      source: result.source === "live" ? "live" : "preview",
      error: null,
    };
  }
  return {
    profile: DEFAULT_PARISH,
    source: "fallback",
    error: result.message,
  };
}
