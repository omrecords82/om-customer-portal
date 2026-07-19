import type { MetricsSlice } from "./metricsApi";
import type { MetricsLiveState } from "./useMetricsDashboard";

/**
 * Wave G metrics presentation helpers — testable copy and source-module links.
 */

export type MetricsSessionContext = {
  readonly liveSession: boolean;
  readonly churchId?: number | null;
};

export function formatMetricsCount(
  value: string | null | undefined,
  loading: boolean,
): string {
  if (loading) return "…";
  if (value == null || value.trim() === "") return "—";
  return value;
}

export function metricsAllZero(metrics: MetricsSlice | null): boolean {
  if (!metrics) return false;
  return (
    metrics.kpis.every((k) => k.value === "0") &&
    metrics.distribution.every((d) => d.value === "0")
  );
}

export function buildMetricsStatusNote(input: {
  readonly session: MetricsSessionContext;
  readonly state: MetricsLiveState;
}): string {
  const { session, state } = input;

  if (!session.liveSession) {
    return "Preview mode — KPI cards stay empty until AUTH_MODE=live with church context (same dashboard API as the parish hub).";
  }
  if (state.status === "loading") {
    return "Loading sacramental metrics from GET /api/churches/:churchId/dashboard…";
  }
  if (state.status === "error") {
    return `Metrics unavailable — ${state.message} Related totals may still appear on the parish dashboard or in Records.`;
  }
  if (state.status === "ready" && state.partialErrors.length > 0) {
    return `Dashboard KPIs loaded. ${state.partialErrors.join(" ")}`;
  }
  if (state.status === "ready" && state.source === "live") {
    const chartsNote = state.metrics?.chartsEnabled
      ? "Charts summary responded (graphical rendering deferred)."
      : "KPI counts from dashboard; OM Charts summary optional.";
    return `Live metrics · ${chartsNote}`;
  }
  return "Metrics await live auth and church context.";
}

export function metricsSourceBadgeLabel(
  state: MetricsLiveState,
  loading: boolean,
): string {
  if (loading) return "Loading…";
  if (state.status === "error") return "Unavailable";
  if (state.status === "ready" && state.source === "live") return "Live";
  return "Preview";
}

export function buildMetricsEmptyKpiCopy(input: {
  readonly state: MetricsLiveState;
  readonly loading: boolean;
}): { readonly title: string; readonly description: string } {
  if (input.loading) {
    return {
      title: "Loading KPIs…",
      description: "Fetching sacramental totals from the church dashboard API.",
    };
  }
  if (input.state.status === "error") {
    return {
      title: "KPIs unavailable",
      description: input.state.message,
    };
  }
  if (input.state.status === "ready" && input.state.source === "preview") {
    return {
      title: "Preview mode",
      description:
        "No sample KPI values shown as live. Enable AUTH_MODE=live with church context to load sacramental totals.",
    };
  }
  if (
    input.state.status === "ready" &&
    metricsAllZero(input.state.metrics)
  ) {
    return {
      title: "No sacramental totals yet",
      description:
        "Dashboard returned zero counts for this parish. Add records to see trends here.",
    };
  }
  return {
    title: "KPIs unavailable",
    description: "Dashboard metrics could not be displayed.",
  };
}

export function buildDistributionEmptyCopy(input: {
  readonly state: MetricsLiveState;
  readonly loading: boolean;
}): string {
  if (input.loading) return "Loading distribution labels…";
  if (input.state.status === "error") {
    return "Distribution unavailable while dashboard metrics failed.";
  }
  if (input.state.status === "ready" && input.state.source === "preview") {
    return "Baptism, marriage, and funeral breakdowns appear here from live dashboard data.";
  }
  return "No distribution rows returned for this parish yet.";
}

export function buildChartsDeferredNote(chartsEnabled: boolean): string {
  if (chartsEnabled) {
    return "Charts summary API responded; graphical series rendering stays deferred (no fake interactive reports).";
  }
  return "Graphical charts require OM Charts enablement. KPI counts above always come from the dashboard API.";
}

export type MetricsSourceModule = {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly apiNote: string;
};

export const METRICS_SOURCE_MODULES: readonly MetricsSourceModule[] = [
  {
    href: "/",
    label: "Parish Dashboard",
    description:
      "Summary KPIs and recent activity from the same dashboard API.",
    apiNote: "GET /api/churches/:churchId/dashboard",
  },
  {
    href: "/records",
    label: "Sacramental Records",
    description:
      "Browse baptisms, marriages, and funerals that feed these counts.",
    apiNote: "Record lists (Wave E); editors deferred Wave H.",
  },
  {
    href: "/certificates",
    label: "Certificates",
    description: "Issuance history complements dashboard on the home hub.",
    apiNote: "GET /api/certificates/history",
  },
];

export function metricsSlice(
  state: MetricsLiveState,
): MetricsSlice | null {
  return state.status === "ready" ? state.metrics : null;
}

export function metricsPartialErrors(
  state: MetricsLiveState,
): readonly string[] {
  return state.status === "ready" ? state.partialErrors : [];
}

export function metricsEmptyNote(state: MetricsLiveState): string | null {
  return state.status === "ready" ? state.emptyNote : null;
}
