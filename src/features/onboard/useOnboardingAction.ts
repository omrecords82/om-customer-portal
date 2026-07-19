import { useEffect, useState } from "react";

import type { OnboardingMeSlice } from "./onboardApi";
import { fetchOnboardingMeSlice, resolveFirstLoginWizardPath } from "./onboardWizardApi";
import { buildOnboardingCta, type OnboardingCta } from "./onboardPresentation";

export type OnboardingActionState = {
  readonly loading: boolean;
  readonly me: OnboardingMeSlice | null;
  readonly wizardPath: string | null;
  readonly cta: OnboardingCta;
};

export function useOnboardingAction(): OnboardingActionState {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<OnboardingMeSlice | null>(null);
  const [wizardPath, setWizardPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchOnboardingMeSlice().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setMe(null);
        setWizardPath(null);
        setLoading(false);
        return;
      }
      setMe(result.data);
      setWizardPath(resolveFirstLoginWizardPath(result.data));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    me,
    wizardPath,
    cta: buildOnboardingCta(wizardPath),
  };
}
