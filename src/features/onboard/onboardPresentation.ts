import type { OnboardingMeSlice } from "./onboardApi";
import { fetchOnboardingMeSlice, resolveFirstLoginWizardPath } from "./onboardWizardApi";

export type OnboardingCta = {
  readonly href: string;
  readonly label: string;
  readonly pending: boolean;
  readonly stepNote: string | null;
};

const WIZARD_PATH_LABELS: Readonly<Record<string, string>> = {
  "/onboarding/change-password": "Continue password setup",
  "/onboarding/record-tables": "Continue record table setup",
  "/onboarding/record-layouts": "Continue record layout setup",
};

/** Build hub/account onboarding CTA from pending wizard path (null = checklist only). */
export function buildOnboardingCta(wizardPath: string | null): OnboardingCta {
  if (wizardPath) {
    const label = WIZARD_PATH_LABELS[wizardPath] ?? "Continue first-login setup";
    return {
      href: wizardPath,
      label,
      pending: true,
      stepNote: "First-login setup is still required before full portal access.",
    };
  }

  return {
    href: "/onboarding",
    label: "View onboarding checklist",
    pending: false,
    stepNote: null,
  };
}

/** Whether the user is tied to an authenticated onboarding request. */
export function hasOnboardingEnrollment(me: OnboardingMeSlice | null): boolean {
  return Boolean(me?.onboardingRequestId);
}

/**
 * Post-login destination — pending first-login wizard wins over `next`.
 * Parity: legacy OM AuthLogin checks `/api/onboarding/me` before hub redirect.
 */
export function resolveAuthenticatedDestination(
  nextPath: string,
  me: OnboardingMeSlice | null,
): string {
  const wizardPath = resolveFirstLoginWizardPath(me);
  return wizardPath ?? nextPath;
}

/** Load onboarding slice and pick post-login route (live API or preview local state). */
export async function fetchAuthenticatedDestination(
  nextPath: string,
): Promise<string> {
  const meResult = await fetchOnboardingMeSlice();
  if (!meResult.ok) return nextPath;
  return resolveAuthenticatedDestination(nextPath, meResult.data);
}
