import { useEffect, useState } from "react";

import { authMode } from "../../auth/config";
import {
  fetchHubLiveData,
  type FetchHubLiveResult,
  type HubActivityItem,
  type HubDashboardSlice,
} from "./hubApi";

export type HubLiveState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly source: "preview" | "live";
      readonly dashboard: HubDashboardSlice | null;
      readonly certificatesIssued: number | null;
      readonly partialErrors: readonly string[];
      readonly activity: readonly HubActivityItem[];
    }
  | { readonly status: "error"; readonly message: string };

const PREVIEW_READY: HubLiveState = {
  status: "ready",
  source: "preview",
  dashboard: null,
  certificatesIssued: null,
  partialErrors: [],
  activity: [],
};

function toReady(result: Extract<FetchHubLiveResult, { ok: true }>): HubLiveState {
  if (result.source === "preview") {
    return PREVIEW_READY;
  }
  return {
    status: "ready",
    source: "live",
    dashboard: result.dashboard,
    certificatesIssued: result.certificatesIssued,
    partialErrors: result.partialErrors,
    activity: result.dashboard?.recentActivity ?? [],
  };
}

/**
 * Loads hub KPIs + activity when live auth + churchId; otherwise preview-ready empties.
 */
export function useHubDashboard(churchId?: number | null): HubLiveState {
  const liveEligible =
    authMode === "live" && churchId != null && churchId > 0;
  const [liveState, setLiveState] = useState<HubLiveState>({
    status: "loading",
  });

  useEffect(() => {
    if (!liveEligible) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external hub dashboard bootstrap
    setLiveState({ status: "loading" });
    void fetchHubLiveData(churchId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLiveState({ status: "error", message: result.message });
        return;
      }
      setLiveState(toReady(result));
    });

    return () => {
      cancelled = true;
    };
  }, [churchId, liveEligible]);

  if (!liveEligible) {
    return PREVIEW_READY;
  }

  return liveState;
}
