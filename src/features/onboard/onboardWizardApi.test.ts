/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";

import {
  allRecordTypesHaveLayoutSelection,
  mapLegacyOnboardingRedirect,
  resolveFirstLoginWizardPath,
} from "./onboardWizardApi";
import { defaultPreviewWizardState, readPreviewWizardState } from "./onboardWizardData";
import { parseOnboardingMe } from "./onboardApi";

describe("onboardWizardApi helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps legacy onboarding redirects to portal routes", () => {
    expect(mapLegacyOnboardingRedirect("/onboarding/record-layouts")).toBe(
      "/onboarding/record-layouts",
    );
    expect(mapLegacyOnboardingRedirect("/portal")).toBe("/");
    expect(mapLegacyOnboardingRedirect("/portal2")).toBe("/");
    expect(mapLegacyOnboardingRedirect(undefined)).toBe("/");
  });

  it("resolves first-login wizard path from onboarding me slice", () => {
    const base = parseOnboardingMe({
      success: true,
      onboarding: {
        onboarding_request_id: "ONB_1",
        status: "awaiting_first_login",
        must_change_password: 0,
        table_configuration_completed: 0,
        layout_configuration_completed: 0,
        first_login_completed: 0,
      },
    });
    expect(base).not.toBeNull();
    if (!base) return;

    expect(resolveFirstLoginWizardPath({ ...base, mustChangePassword: true })).toBe(
      "/onboarding/change-password",
    );
    expect(resolveFirstLoginWizardPath({ ...base, mustChangePassword: false })).toBe(
      "/onboarding/record-tables",
    );
    expect(
      resolveFirstLoginWizardPath({
        ...base,
        mustChangePassword: false,
        tableConfigurationCompleted: true,
      }),
    ).toBe("/onboarding/record-layouts");
    expect(
      resolveFirstLoginWizardPath({
        ...base,
        mustChangePassword: false,
        tableConfigurationCompleted: true,
        layoutConfigurationCompleted: true,
      }),
    ).toBeNull();
    expect(resolveFirstLoginWizardPath(null)).toBeNull();
  });

  it("requires at least one layout per record type", () => {
    expect(allRecordTypesHaveLayoutSelection(["baptism", "marriage"], { baptism: ["a"] })).toBe(
      false,
    );
    expect(
      allRecordTypesHaveLayoutSelection(["baptism", "marriage"], {
        baptism: ["a"],
        marriage: ["b"],
      }),
    ).toBe(true);
  });

  it("seeds preview wizard state with password step pending", () => {
    const state = defaultPreviewWizardState();
    expect(state.mustChangePassword).toBe(true);
    expect(state.tables).toHaveLength(2);
    expect(readPreviewWizardState().onboardingRequestId).toBe("ONB_PREVIEW");
  });
});
