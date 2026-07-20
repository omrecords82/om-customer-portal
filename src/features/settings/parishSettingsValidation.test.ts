import { describe, expect, it } from "vitest";

import {
  applyJurisdictionSelection,
  churchSettingsToParishProfile,
  parseJurisdictionsResponse,
  parishProfileToChurchPayload,
} from "./settingsApi";
import { DEFAULT_PARISH } from "./settingsData";
import {
  formatParishLocationLine,
  parishProfilesEqual,
  validateParishProfile,
} from "./parishSettingsValidation";

describe("parish settings parity mappers", () => {
  it("maps full church settings to discrete parish profile fields", () => {
    const profile = churchSettingsToParishProfile({
      name: "Holy Trinity Orthodox Church",
      short_name: "Holy Trinity",
      email: "office@example.com",
      phone: "555-0100",
      website: "https://example.com",
      address: "123 Main St",
      city: "Manville",
      state_province: "NJ",
      postal_code: "08835",
      country: "United States",
      jurisdiction_id: 12,
      jurisdiction_name: "Diocese of NY & NJ",
      jurisdiction_calendar_type: "Revised Julian",
      preferred_language: "en",
    });
    expect(profile.address).toBe("123 Main St");
    expect(profile.jurisdictionId).toBe(12);
    expect(profile.calendarType).toBe("Revised Julian");
    expect(formatParishLocationLine(profile)).toBe("Manville, NJ");
  });

  it("builds full PUT payload for church-settings", () => {
    const payload = parishProfileToChurchPayload({
      ...DEFAULT_PARISH,
      jurisdictionId: 5,
      jurisdictionName: "Test Diocese",
    });
    expect(payload).toMatchObject({
      address: DEFAULT_PARISH.address,
      postal_code: DEFAULT_PARISH.postalCode,
      country: DEFAULT_PARISH.country,
      jurisdiction_id: 5,
      preferred_language: "en",
    });
  });

  it("parses jurisdictions list", () => {
    const items = parseJurisdictionsResponse({
      items: [{ id: 1, name: "OCA", abbreviation: "OCA", calendar_type: "Julian" }],
    });
    expect(items[0]?.calendarType).toBe("Julian");
  });

  it("applies jurisdiction selection with derived calendar", () => {
    const next = applyJurisdictionSelection(DEFAULT_PARISH, {
      id: 2,
      name: "GOC",
      abbreviation: "GOC",
      calendarType: "Julian",
    });
    expect(next.jurisdictionId).toBe(2);
    expect(next.calendarType).toBe("Julian");
  });

  it("validates parish profile email/website", () => {
    expect(validateParishProfile({ ...DEFAULT_PARISH, name: "" }).ok).toBe(false);
    expect(validateParishProfile({ ...DEFAULT_PARISH, email: "bad" }).ok).toBe(false);
    expect(validateParishProfile(DEFAULT_PARISH).ok).toBe(true);
  });

  it("detects dirty parish profiles", () => {
    expect(parishProfilesEqual(DEFAULT_PARISH, DEFAULT_PARISH)).toBe(true);
    expect(parishProfilesEqual(DEFAULT_PARISH, { ...DEFAULT_PARISH, city: "Other" })).toBe(
      false,
    );
  });
});
