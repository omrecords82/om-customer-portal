import { DEFAULT_PARISH } from "../features/settings/settingsData";

/** Preview fallback parish identity; live shell chrome loads via ParishProfileProvider. */
export const parish = DEFAULT_PARISH;

/** Fallback chrome identity when no session user is loaded yet. */
export const FALLBACK_USER = {
  name: "Parish Administrator",
  role: "Church Administrator",
  initials: "PA",
} as const;
