import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import { fetchChurchDashboardJson } from "../hub/hubApi";

/**
 * Wave G church metrics client.
 * Parity: OM Charts + Dashboard Home
 *   - GET /api/churches/:churchId/dashboard — KPI counts, YoY, distribution labels
 *   - GET /api/churches/:churchId/charts/summary — series (feature-flagged; chart libs deferred)
 */

export type MetricsKpi = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
};

export type MetricsLabelRow = {
  readonly label: string;
  readonly value: string;
};

export type MetricsSlice = {
  readonly kpis: readonly MetricsKpi[];
  readonly distribution: readonly MetricsLabelRow[];
  readonly seriesNotes: readonly string[];
  /** Present when charts/summary succeeded (series still deferred visually). */
  readonly chartsEnabled: boolean;
};

export type FetchMetricsResult =
  | {
      readonly ok: true;
      readonly source: "preview";
      readonly metrics: null;
    }
  | {
      readonly ok: true;
      readonly source: "live";
      readonly metrics: MetricsSlice;
      readonly partialErrors: readonly string[];
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly status: number;
    };

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function formatTrend(changePercent: number | null): string {
  if (changePercent == null || !Number.isFinite(changePercent)) {
    return "Year-over-year unavailable";
  }
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${String(changePercent)}% vs prior year`;
}

/** Pure unwrap of GET /api/churches/:churchId/dashboard for metrics KPIs/labels. */
export function unwrapMetricsDashboard(payload: unknown): MetricsSlice | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const countsRaw =
    data.counts && typeof data.counts === "object"
      ? (data.counts as Record<string, unknown>)
      : {};
  const baptisms = asNumber(countsRaw.baptisms);
  const marriages = asNumber(countsRaw.marriages);
  const funerals = asNumber(countsRaw.funerals);
  const total = asNumber(countsRaw.total, baptisms + marriages + funerals);

  let changePercent: number | null = null;
  let currentYear: number | null = null;
  if (data.yearOverYear && typeof data.yearOverYear === "object") {
    const yoy = data.yearOverYear as Record<string, unknown>;
    changePercent = asNumber(yoy.changePercent, NaN);
    if (!Number.isFinite(changePercent)) changePercent = null;
    const cy = asNumber(yoy.currentYear, NaN);
    currentYear = Number.isFinite(cy) ? cy : null;
  }

  const yearNote =
    currentYear != null
      ? `${String(currentYear)} calendar totals in dashboard`
      : "All-time sacramental totals";

  const distribution: MetricsLabelRow[] = [];
  const distRaw = data.typeDistribution;
  if (Array.isArray(distRaw)) {
    for (const row of distRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = asString(r.name);
      if (!name) continue;
      distribution.push({
        label: name,
        value: formatCount(asNumber(r.value)),
      });
    }
  }
  if (distribution.length === 0) {
    distribution.push(
      { label: "Baptisms", value: formatCount(baptisms) },
      { label: "Marriages", value: formatCount(marriages) },
      { label: "Funerals", value: formatCount(funerals) },
    );
  }

  const seriesNotes: string[] = [];
  if (
    data.dateRange &&
    typeof data.dateRange === "object"
  ) {
    const range = data.dateRange as Record<string, unknown>;
    const earliest = asNumber(range.earliest, NaN);
    const latest = asNumber(range.latest, NaN);
    if (Number.isFinite(earliest) && Number.isFinite(latest)) {
      seriesNotes.push(
        `Record span: ${String(earliest)}–${String(latest)}`,
      );
    }
  }
  const completeness = asNumber(data.completeness, NaN);
  if (Number.isFinite(completeness)) {
    seriesNotes.push(`Field completeness: ${String(completeness)}%`);
  }

  return {
    kpis: [
      {
        label: "Total sacraments",
        value: formatCount(total),
        note: formatTrend(changePercent),
      },
      {
        label: "Baptisms",
        value: formatCount(baptisms),
        note: yearNote,
      },
      {
        label: "Marriages",
        value: formatCount(marriages),
        note: yearNote,
      },
      {
        label: "Funerals",
        value: formatCount(funerals),
        note: yearNote,
      },
    ],
    distribution,
    seriesNotes,
    chartsEnabled: false,
  };
}

/** Pure label notes from charts/summary (no chart rendering). */
export function unwrapChartsSummaryLabels(
  payload: unknown,
): { readonly notes: readonly string[]; readonly ok: boolean } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, notes: [] };
  }
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const notes: string[] = [];
  const byYear = data.sacramentsByYear;
  if (Array.isArray(byYear) && byYear.length > 0) {
    const years = byYear
      .map((row) =>
        row && typeof row === "object"
          ? asNumber((row as Record<string, unknown>).year, NaN)
          : NaN,
      )
      .filter((y) => Number.isFinite(y));
    if (years.length > 0) {
      notes.push(
        `Charts series available: ${String(Math.min(...years))}–${String(Math.max(...years))} (rendering deferred)`,
      );
    }
  }

  const byPriest = data.byPriest;
  if (Array.isArray(byPriest) && byPriest.length > 0) {
    const top = byPriest[0];
    if (top && typeof top === "object") {
      const t = top as Record<string, unknown>;
      const name = asString(t.name).trim();
      const count = asNumber(t.count);
      if (name) {
        notes.push(`Top clergy by records: ${name} (${formatCount(count)})`);
      }
    }
  }

  return { ok: notes.length > 0 || root.success === true, notes };
}

async function fetchDashboardMetrics(
  churchId: number,
): Promise<
  | { readonly ok: true; readonly metrics: MetricsSlice }
  | { readonly ok: false; readonly message: string; readonly status: number }
> {
  const jsonRes = await fetchChurchDashboardJson(churchId);
  if (!jsonRes.ok) {
    return {
      ok: false,
      message: jsonRes.message.replace(
        "Dashboard unavailable",
        "Dashboard metrics unavailable",
      ),
      status: jsonRes.status,
    };
  }
  const metrics = unwrapMetricsDashboard(jsonRes.payload);
  if (!metrics) {
    return {
      ok: false,
      message: "Dashboard metrics response was empty or malformed.",
      status: 502,
    };
  }
  return { ok: true, metrics };
}

async function fetchChartsSummaryNotes(
  churchId: number,
): Promise<
  | { readonly ok: true; readonly notes: readonly string[] }
  | { readonly ok: false; readonly message: string; readonly status: number }
> {
  try {
    const res = await apiFetch(
      `/api/churches/${String(churchId)}/charts/summary`,
      { method: "GET" },
    );
    if (res.status === 403) {
      return {
        ok: false,
        message:
          "OM Charts is not enabled for this church (KPI counts still from dashboard).",
        status: 403,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Charts summary unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    const { notes, ok } = unwrapChartsSummaryLabels(payload);
    if (!ok && notes.length === 0) {
      return {
        ok: false,
        message: "Charts summary was empty or malformed.",
        status: 502,
      };
    }
    return { ok: true, notes };
  } catch {
    return {
      ok: false,
      message: "Network error loading charts summary.",
      status: 0,
    };
  }
}

/**
 * Load metrics when `AUTH_MODE=live` + churchId.
 * Preview keeps honest nulls (no sample KPIs as-if-live).
 * Dashboard drives KPIs; charts/summary adds label notes when flagged on.
 */
export async function fetchChurchMetrics(
  churchId?: number | null,
): Promise<FetchMetricsResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview", metrics: null };
  }

  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for live metrics.",
      status: 400,
    };
  }

  const [dashRes, chartsRes] = await Promise.all([
    fetchDashboardMetrics(churchId),
    fetchChartsSummaryNotes(churchId),
  ]);

  if (!dashRes.ok) {
    return {
      ok: false,
      message: dashRes.message,
      status: dashRes.status,
    };
  }

  const partialErrors: string[] = [];
  let seriesNotes = [...dashRes.metrics.seriesNotes];
  let chartsEnabled = false;

  if (chartsRes.ok) {
    chartsEnabled = true;
    seriesNotes = [...seriesNotes, ...chartsRes.notes];
  } else {
    partialErrors.push(chartsRes.message);
  }

  return {
    ok: true,
    source: "live",
    metrics: {
      ...dashRes.metrics,
      seriesNotes,
      chartsEnabled,
    },
    partialErrors,
  };
}
