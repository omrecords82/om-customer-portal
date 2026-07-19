/** Parish context for portal chrome (Wave C will load from API). */
export const parish = {
  name: "Saints Peter and Paul Orthodox Church",
  shortName: "Sts. Peter & Paul",
  location: "Manville, New Jersey",
  diocese: "Diocese of New York & New Jersey",
} as const;

/** Fallback chrome identity when no session user is loaded yet. */
export const FALLBACK_USER = {
  name: "Parish Administrator",
  role: "Church Administrator",
  initials: "PA",
} as const;
