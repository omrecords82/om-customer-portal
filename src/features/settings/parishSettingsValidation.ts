import type { ParishProfile } from "./settingsData";

export type ParishValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidWebsite(value: string): boolean {
  if (!value.trim()) return true;
  return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value.trim());
}

/** Client-side validation before PUT /api/my/church-settings. */
export function validateParishProfile(profile: ParishProfile): ParishValidationResult {
  if (!profile.name.trim()) {
    return { ok: false, message: "Official church name is required." };
  }
  if (!isValidEmail(profile.email)) {
    return { ok: false, message: "Office email format is invalid." };
  }
  if (!isValidWebsite(profile.website)) {
    return { ok: false, message: "Website URL format is invalid." };
  }
  return { ok: true };
}

/** Compact location line for shell chrome (city + state). */
export function formatParishLocationLine(profile: Pick<ParishProfile, "city" | "stateProvince" | "address">): string {
  const city = profile.city.trim();
  const state = profile.stateProvince.trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return profile.address.trim();
}

/** Jurisdiction label for shell chrome. */
export function formatParishJurisdictionLine(
  profile: Pick<ParishProfile, "jurisdictionName">,
): string {
  return profile.jurisdictionName.trim();
}

/** Detect unsaved parish profile edits. */
export function parishProfilesEqual(a: ParishProfile, b: ParishProfile): boolean {
  return (
    a.name === b.name &&
    a.shortName === b.shortName &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.website === b.website &&
    a.address === b.address &&
    a.city === b.city &&
    a.stateProvince === b.stateProvince &&
    a.postalCode === b.postalCode &&
    a.country === b.country &&
    a.jurisdictionId === b.jurisdictionId &&
    a.preferredLanguage === b.preferredLanguage
  );
}
