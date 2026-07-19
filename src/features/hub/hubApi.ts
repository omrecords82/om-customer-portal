import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";

/**
 * Wave D hub data client.
 * Parity: ModernDashboard + ChurchPortalHub / usePortalHub
 *   - GET /api/churches/:churchId/dashboard — counts, monthly, recent activity
 *   - GET /api/certificates/history — issued certificate count
 * Membership roster has no non-admin parish API; hub uses sacramental totals instead.
 */

export type HubActivityItem = {
  readonly name: string;
  readonly type: "baptism" | "marriage" | "funeral";
  readonly date: string;
};

export type HubDashboardSlice = {
  readonly totalRecords: number;
  readonly recordsThisMonth: number;
  readonly baptisms: number;
  readonly marriages: number;
  readonly funerals: number;
  readonly recentActivity: readonly HubActivityItem[];
};

export type FetchHubLiveResult =
  | {
      readonly ok: true;
      readonly source: "preview";
      readonly dashboard: null;
      readonly certificatesIssued: null;
    }
  | {
      readonly ok: true;
      readonly source: "live";
      readonly dashboard: HubDashboardSlice | null;
      readonly certificatesIssued: number | null;
      /** Per-endpoint failures while other slices may still be live. */
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

function currentYearMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${String(now.getFullYear())}-${month}`;
}

function normalizeActivityType(
  value: unknown,
): HubActivityItem["type"] | null {
  const raw = asString(value).toLowerCase();
  if (raw === "baptism" || raw === "marriage" || raw === "funeral") {
    return raw;
  }
  return null;
}

function formatActivityDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = asString(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}

export function unwrapDashboardPayload(payload: unknown): HubDashboardSlice | null {
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
  const totalRecords = asNumber(
    countsRaw.total,
    baptisms + marriages + funerals,
  );

  const ym = currentYearMonth();
  let recordsThisMonth = 0;
  const monthly = data.monthlyActivity;
  if (Array.isArray(monthly)) {
    for (const row of monthly) {
      if (!row || typeof row !== "object") continue;
      const m = row as Record<string, unknown>;
      if (asString(m.month) !== ym) continue;
      recordsThisMonth +=
        asNumber(m.baptism) + asNumber(m.marriage) + asNumber(m.funeral);
    }
  }

  const recentActivity: HubActivityItem[] = [];
  const activity = data.recentActivity;
  if (Array.isArray(activity)) {
    for (const row of activity) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const type = normalizeActivityType(r.type);
      if (!type) continue;
      recentActivity.push({
        name: asString(r.name, "Unknown"),
        type,
        date: formatActivityDate(r.date),
      });
    }
  }

  return {
    totalRecords,
    recordsThisMonth,
    baptisms,
    marriages,
    funerals,
    recentActivity,
  };
}

function countCertificateHistoryRows(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const obj = payload as Record<string, unknown>;
  const list = obj.history ?? obj.entries ?? obj.data ?? obj.results;
  return Array.isArray(list) ? list.length : 0;
}

export type FetchDashboardJsonResult =
  | { readonly ok: true; readonly payload: unknown }
  | { readonly ok: false; readonly message: string; readonly status: number };

/** GET /api/churches/:churchId/dashboard — shared JSON fetch for hub + metrics. */
export async function fetchChurchDashboardJson(
  churchId: number,
): Promise<FetchDashboardJsonResult> {
  if (!Number.isFinite(churchId) || churchId <= 0) {
    return { ok: false, message: "Invalid church id.", status: 400 };
  }

  try {
    const res = await apiFetch(`/api/churches/${String(churchId)}/dashboard`, {
      method: "GET",
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Dashboard unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        message: "Dashboard response was empty or malformed.",
        status: 502,
      };
    }
    return { ok: true, payload };
  } catch {
    return {
      ok: false,
      message: "Network error loading dashboard.",
      status: 0,
    };
  }
}

/** GET /api/churches/:churchId/dashboard */
export async function fetchChurchDashboard(
  churchId: number,
): Promise<
  | { readonly ok: true; readonly dashboard: HubDashboardSlice }
  | { readonly ok: false; readonly message: string; readonly status: number }
> {
  const jsonRes = await fetchChurchDashboardJson(churchId);
  if (!jsonRes.ok) {
    return jsonRes;
  }
  const dashboard = unwrapDashboardPayload(jsonRes.payload);
  if (!dashboard) {
    return {
      ok: false,
      message: "Dashboard response was empty or malformed.",
      status: 502,
    };
  }
  return { ok: true, dashboard };
}

/** GET /api/certificates/history?church_id=&limit= for issued count. */
export async function fetchCertificateIssuedCount(
  churchId: number,
): Promise<
  | { readonly ok: true; readonly count: number }
  | { readonly ok: false; readonly message: string; readonly status: number }
> {
  if (!Number.isFinite(churchId) || churchId <= 0) {
    return { ok: false, message: "Invalid church id.", status: 400 };
  }

  try {
    const res = await apiFetch(
      `/api/certificates/history?church_id=${String(churchId)}&limit=200`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Certificate history unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    return { ok: true, count: countCertificateHistoryRows(payload) };
  } catch {
    return {
      ok: false,
      message: "Network error loading certificate history.",
      status: 0,
    };
  }
}

/**
 * Load hub widgets when `AUTH_MODE=live` + churchId present.
 * Preview/mock auth keeps honest nulls (not sample KPIs).
 * Partial failures preserve successful slices and list errors.
 */
export async function fetchHubLiveData(
  churchId?: number | null,
): Promise<FetchHubLiveResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      dashboard: null,
      certificatesIssued: null,
    };
  }

  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for live hub data.",
      status: 400,
    };
  }

  const [dashRes, certRes] = await Promise.all([
    fetchChurchDashboard(churchId),
    fetchCertificateIssuedCount(churchId),
  ]);

  const partialErrors: string[] = [];
  let dashboard: HubDashboardSlice | null = null;
  let certificatesIssued: number | null = null;

  if (dashRes.ok) {
    dashboard = dashRes.dashboard;
  } else {
    partialErrors.push(dashRes.message);
  }

  if (certRes.ok) {
    certificatesIssued = certRes.count;
  } else {
    partialErrors.push(certRes.message);
  }

  if (!dashboard && certificatesIssued == null) {
    const status = !dashRes.ok
      ? dashRes.status
      : !certRes.ok
        ? certRes.status
        : 500;
    return {
      ok: false,
      message: partialErrors.join(" ") || "Hub data unavailable.",
      status,
    };
  }

  return {
    ok: true,
    source: "live",
    dashboard,
    certificatesIssued,
    partialErrors,
  };
}
