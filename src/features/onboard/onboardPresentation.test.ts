/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import {
  buildOnboardingCta,
  hasOnboardingEnrollment,
  resolveAuthenticatedDestination,
} from "./onboardPresentation";
import { parseOnboardingMe } from "./onboardApi";

describe("onboardPresentation", () => {
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

  it("builds pending wizard CTA with deep link", () => {
    expect(buildOnboardingCta("/onboarding/record-tables")).toEqual({
      href: "/onboarding/record-tables",
      label: "Continue record table setup",
      pending: true,
      stepNote: "First-login setup is still required before full portal access.",
    });
  });

  it("builds checklist CTA when wizard is complete", () => {
    expect(buildOnboardingCta(null)).toEqual({
      href: "/onboarding",
      label: "View onboarding checklist",
      pending: false,
      stepNote: null,
    });
  });

  it("prefers wizard path over next for post-login routing", () => {
    expect(base).not.toBeNull();
    if (!base) return;

    expect(
      resolveAuthenticatedDestination("/records?type=baptism", {
        ...base,
        mustChangePassword: true,
      }),
    ).toBe("/onboarding/change-password");

    expect(
      resolveAuthenticatedDestination("/records?type=baptism", {
        ...base,
        mustChangePassword: false,
        tableConfigurationCompleted: true,
        layoutConfigurationCompleted: true,
      }),
    ).toBe("/records?type=baptism");
  });

  it("detects onboarding enrollment from me slice", () => {
    expect(hasOnboardingEnrollment(base)).toBe(true);
    expect(hasOnboardingEnrollment(null)).toBe(false);
    expect(
      hasOnboardingEnrollment({
        onboardingRequestId: null,
        status: null,
        mustChangePassword: false,
        tableConfigurationCompleted: false,
        layoutConfigurationCompleted: false,
        firstLoginCompleted: false,
      }),
    ).toBe(false);
  });
});
