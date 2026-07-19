import { describe, expect, it } from "vitest";

import {
  canEditChurchSettings,
  canUnlockParishUsers,
  canViewParishUsers,
  churchSettingsToParishProfile,
  churchUserRowToParishUser,
  churchUserStatus,
  extractApiMessage,
  extractChurchSettings,
  formatChurchLocation,
  formatParishUserRole,
  notificationRowsToPortalPrefs,
  parseChurchUsersResponse,
  parishLocationToApiFields,
  parishProfileToChurchPayload,
  parseUserProfile,
  portalPrefsToNotificationUpdates,
} from "./settingsApi";

describe("settingsApi helpers", () => {
  it("extracts API error messages from nested shapes", () => {
    expect(
      extractApiMessage({ data: { message: "No church assignment found" } }, "fallback"),
    ).toBe("No church assignment found");
    expect(extractApiMessage({ message: "Invalid password" }, "fallback")).toBe(
      "Invalid password",
    );
    expect(extractApiMessage(null, "fallback")).toBe("fallback");
  });

  it("normalizes church settings response wrappers", () => {
    expect(
      extractChurchSettings({
        success: true,
        data: { settings: { name: "Sts. Peter & Paul", city: "Manville" } },
      }),
    ).toEqual({ name: "Sts. Peter & Paul", city: "Manville" });
    expect(
      extractChurchSettings({ success: true, settings: { church_name: "Legacy Name" } }),
    ).toEqual({ church_name: "Legacy Name" });
    expect(extractChurchSettings({ success: false })).toBeNull();
  });

  it("maps church settings to parish profile fields", () => {
    const profile = churchSettingsToParishProfile({
      name: "Holy Trinity Orthodox Church",
      short_name: "Holy Trinity",
      city: "Manville",
      state_province: "NJ",
      jurisdiction_name: "Diocese of NY & NJ",
      phone: "(908) 555-0142",
      email: "office@example.com",
      website: "https://example.com",
    });
    expect(profile.name).toBe("Holy Trinity Orthodox Church");
    expect(profile.location).toBe("Manville, NJ");
    expect(profile.diocese).toBe("Diocese of NY & NJ");
  });

  it("formats church location from city/state or address", () => {
    expect(formatChurchLocation({ city: "Boston", state_province: "MA" })).toBe(
      "Boston, MA",
    );
    expect(formatChurchLocation({ address: "123 Main St" })).toBe("123 Main St");
  });

  it("round-trips parish location for API payload", () => {
    expect(parishLocationToApiFields("Manville, New Jersey")).toEqual({
      city: "Manville",
      state_province: "New Jersey",
    });
    expect(parishProfileToChurchPayload({
      name: "Test Church",
      shortName: "Test",
      location: "Manville, NJ",
      diocese: "Diocese",
      phone: "555",
      email: "a@b.com",
      website: "https://x.com",
    })).toMatchObject({
      name: "Test Church",
      short_name: "Test",
      city: "Manville",
      state_province: "NJ",
      jurisdiction: "Diocese",
    });
  });

  it("parses user profile payload", () => {
    const profile = parseUserProfile({
      success: true,
      profile: {
        display_name: "Fr. Michael",
        email: "priest@example.com",
        phone: "555-0100",
        church_name: "Holy Trinity",
      },
    });
    expect(profile).toEqual({
      displayName: "Fr. Michael",
      email: "priest@example.com",
      phone: "555-0100",
      company: "",
      location: "",
      churchName: "Holy Trinity",
    });
  });

  it("maps notification rows to portal toggles", () => {
    const prefs = notificationRowsToPortalPrefs([
      {
        type_name: "weekly_digest",
        email_enabled: 1,
        in_app_enabled: 0,
      },
      {
        type_name: "certificate_ready",
        email_enabled: 0,
        in_app_enabled: 1,
      },
    ]);
    expect(prefs.emailDigest).toBe(true);
    expect(prefs.certificateAlerts).toBe(false);
    expect(prefs.ocrJobAlertsLive).toBe(false);
  });

  it("builds notification update payload for supported types only", () => {
    const updates = portalPrefsToNotificationUpdates(
      { emailDigest: false, ocrJobAlerts: true, certificateAlerts: true },
      [
        {
          type_name: "weekly_digest",
          email_enabled: 1,
          in_app_enabled: 0,
        },
        {
          type_name: "certificate_ready",
          email_enabled: 0,
          in_app_enabled: 1,
        },
      ],
    );
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({
      type_name: "weekly_digest",
      email_enabled: false,
      frequency: "weekly",
    });
    expect(updates[1]).toMatchObject({
      type_name: "certificate_ready",
      email_enabled: true,
    });
  });

  it("checks church editor roles", () => {
    expect(canEditChurchSettings("church_admin")).toBe(true);
    expect(canEditChurchSettings("editor")).toBe(false);
  });

  it("checks parish user admin roles", () => {
    expect(canViewParishUsers("priest")).toBe(true);
    expect(canViewParishUsers("manager")).toBe(true);
    expect(canViewParishUsers("editor")).toBe(false);
    expect(canUnlockParishUsers("church_admin")).toBe(true);
  });

  it("formats parish user roles from church or system role", () => {
    expect(formatParishUserRole("church_admin", "user")).toBe("Church Admin");
    expect(formatParishUserRole("", "priest")).toBe("Priest");
  });

  it("maps church user API rows to portal parish users", () => {
    expect(
      churchUserRowToParishUser({
        id: 42,
        email: "editor@example.com",
        first_name: "Elena",
        last_name: "Records",
        church_role: "editor",
        system_role: "user",
        is_active: 1,
        is_locked: 0,
      }),
    ).toMatchObject({
      id: "42",
      name: "Elena Records",
      email: "editor@example.com",
      role: "Editor",
      status: "active",
      isLocked: false,
    });

    expect(
      churchUserStatus({
        id: 1,
        email: "x@y.com",
        first_name: "",
        last_name: "",
        church_role: "",
        system_role: "",
        is_active: 0,
        is_locked: 1,
      }),
    ).toBe("pending");
  });

  it("parses church users list response wrappers", () => {
    const users = parseChurchUsersResponse({
      success: true,
      data: {
        users: [
          {
            id: 1,
            email: "a@b.com",
            first_name: "Ann",
            last_name: "Admin",
            church_role: "church_admin",
            system_role: "user",
            is_active: 1,
            is_locked: 0,
          },
        ],
      },
    });
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe("Ann Admin");
  });
});
