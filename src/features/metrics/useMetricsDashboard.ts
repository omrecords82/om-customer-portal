import { useEffect, useState } from "react";

import { authMode } from "../../auth/config";
import {
  fetchChurchMetrics,
  type FetchMetricsResult,
  type MetricsSlice,
} from "./metricsApi";

export type MetricsLiveState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly source: "preview" | "live";
      readonly metrics: MetricsSlice | null;
      readonly partialErrors: readonly string[];
      readonly emptyNote: string | null;
    }
  | { readonly status: "error"; readonly message: string };

const PREVIEW_READY: MetricsLiveState = {
  status: "ready",
  source: "preview",
  metrics: null,
  partialErrors: [],
  emptyNote: null,
};

function toReady(
  result: Extract<FetchMetricsResult, { ok: true }>,
): MetricsLiveState {
  if (result.source === "preview") {
    return PREVIEW_READY;
  }

  let emptyNote: string | null = null;
  if (
    result.metrics.kpis.every((k) => k.value === "0") &&
    result.metrics.distribution.every((d) => d.value === "0")
  ) {
    emptyNote = "No sacramental totals for this church yet.";
  }

  return {
    status: "ready",
    source: "live",
    metrics: result.metrics,
    partialErrors: result.partialErrors,
    emptyNote,
  };
}

/**
 * Loads metrics KPIs when live auth + churchId; otherwise preview-ready empties.
 */
export function useMetricsDashboard(
  churchId?: number | null,
): MetricsLiveState {
  const liveEligible =
    authMode === "live" && churchId != null && churchId > 0;
  const [liveState, setLiveState] = useState<MetricsLiveState>({
    status: "loading",
  });

  useEffect(() => {
    if (!liveEligible) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external metrics bootstrap
    setLiveState({ status: "loading" });
    void fetchChurchMetrics(churchId).then((result) => {
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
