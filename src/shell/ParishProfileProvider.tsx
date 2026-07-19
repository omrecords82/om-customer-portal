import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/AuthProvider";
import { authMode } from "../auth/config";
import { fetchParishProfile } from "../features/settings/settingsApi";
import { DEFAULT_PARISH, type ParishProfile } from "../features/settings/settingsData";
import {
  parishChromeFromFetchResult,
  parishChromeNote,
  type ParishChromeSource,
} from "./parishProfileState";

export type ParishProfileContextValue = {
  readonly profile: ParishProfile;
  readonly source: ParishChromeSource;
  readonly loading: boolean;
  readonly error: string | null;
  readonly note: string | null;
  readonly refresh: () => Promise<void>;
};

const ParishProfileContext = createContext<ParishProfileContextValue | null>(null);

const PREVIEW_VALUE: Omit<ParishProfileContextValue, "refresh"> = {
  profile: DEFAULT_PARISH,
  source: "preview",
  loading: false,
  error: null,
  note: parishChromeNote("preview", null),
};

export function ParishProfileProvider({ children }: { readonly children: ReactNode }) {
  const { user, ready, isAuthenticated } = useAuth();
  const liveEligible = authMode === "live" && ready && isAuthenticated;

  const [snapshot, setSnapshot] = useState<Omit<ParishProfileContextValue, "refresh">>(
    liveEligible ? { ...PREVIEW_VALUE, loading: true } : PREVIEW_VALUE,
  );

  const refresh = useCallback(async () => {
    if (!liveEligible) {
      setSnapshot(PREVIEW_VALUE);
      return;
    }

    setSnapshot((prev) => ({ ...prev, loading: true, error: null }));
    const result = await fetchParishProfile(user?.role);
    const next = parishChromeFromFetchResult(true, result);
    setSnapshot({
      profile: next.profile,
      source: next.source,
      loading: false,
      error: next.error,
      note: parishChromeNote(next.source, next.error),
    });
  }, [liveEligible, user?.role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external parish chrome bootstrap
    void refresh();
  }, [refresh]);

  const value = useMemo<ParishProfileContextValue>(
    () => ({
      ...snapshot,
      refresh,
    }),
    [snapshot, refresh],
  );

  return (
    <ParishProfileContext.Provider value={value}>{children}</ParishProfileContext.Provider>
  );
}

export function useParishProfile(): ParishProfileContextValue {
  const ctx = useContext(ParishProfileContext);
  if (!ctx) {
    throw new Error("useParishProfile must be used within ParishProfileProvider");
  }
  return ctx;
}
