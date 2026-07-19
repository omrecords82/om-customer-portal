import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";

/**
 * Wave G cemetery read client.
 * Parity: legacy `/portal/cemetery/*` → `/api/churches/:churchId/cemetery/*`
 *   - GET /plots — plot list
 *   - GET /people/search?q= — deceased person search
 * Map geometry (`/render-geometry`) stays gated by cemetery.mapEnabled; no editing.
 */

export type CemeteryPlotRow = {
  readonly id: string;
  readonly section: string;
  readonly lot: string;
  readonly status: string;
  readonly name: string;
  readonly rowNo: string | null;
};

export type CemeteryPersonHit = {
  readonly personId: string;
  readonly name: string;
  readonly deathDate: string | null;
  readonly plotId: string | null;
  readonly plotNumber: string | null;
  readonly sectionCode: string | null;
};

export type FetchCemeteryPlotsResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly plots: readonly CemeteryPlotRow[];
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type SearchDeceasedResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly people: readonly CemeteryPersonHit[];
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

/** Preview stub rows — never presented as live church data. */
export const MOCK_CEMETERY_PLOTS: readonly CemeteryPlotRow[] = [
  {
    id: "p1",
    section: "A",
    lot: "12",
    status: "occupied",
    name: "Kozlov family",
    rowNo: "1",
  },
  {
    id: "p2",
    section: "A",
    lot: "14",
    status: "available",
    name: "—",
    rowNo: "1",
  },
  {
    id: "p3",
    section: "B",
    lot: "3",
    status: "reserved",
    name: "Petrov",
    rowNo: "2",
  },
];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  const s = asString(value).trim();
  return s ? s : null;
}

function formatPersonName(
  first: unknown,
  last: unknown,
): string {
  const parts = [asString(first).trim(), asString(last).trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function formatDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = asString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}

/** Pure map of GET /plots payload rows. */
export function unwrapCemeteryPlots(payload: unknown): readonly CemeteryPlotRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root)
      ? root
      : [];
  const out: CemeteryPlotRow[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = asId(r.id ?? r.plotId);
    if (!id) continue;
    const occupants = asString(r.occupants).trim();
    const surname = asString(r.surname).trim();
    out.push({
      id,
      section: asString(r.sectionCode ?? r.section, "—") || "—",
      lot: asString(r.plotNumber ?? r.displayNumbers ?? r.lot, "—") || "—",
      status: asString(r.status, "unknown").toLowerCase() || "unknown",
      name: occupants || surname || "—",
      rowNo: asString(r.rowNo).trim() || null,
    });
  }
  return out;
}

/** Pure map of GET /people/search payload rows. */
export function unwrapCemeteryPeople(
  payload: unknown,
): readonly CemeteryPersonHit[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root)
      ? root
      : [];
  const out: CemeteryPersonHit[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const personId = asId(r.personId ?? r.id);
    if (!personId) continue;
    out.push({
      personId,
      name: formatPersonName(r.firstName, r.lastName),
      deathDate: formatDate(r.deathDate),
      plotId: asId(r.plotId),
      plotNumber: asString(r.plotNumber).trim() || null,
      sectionCode: asString(r.sectionCode).trim() || null,
    });
  }
  return out;
}

/**
 * Load plots when live + churchId; otherwise mock stub for enabled UI chrome.
 */
export async function fetchCemeteryPlots(
  churchId?: number | null,
): Promise<FetchCemeteryPlotsResult> {
  if (authMode !== "live") {
    return { ok: true, source: "mock", plots: MOCK_CEMETERY_PLOTS };
  }
  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for live cemetery plots.",
      status: 400,
    };
  }

  try {
    const res = await apiFetch(
      `/api/churches/${String(churchId)}/cemetery/plots`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Cemetery plots unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    return {
      ok: true,
      source: "live",
      plots: unwrapCemeteryPlots(payload),
    };
  } catch {
    return {
      ok: false,
      message: "Network error loading cemetery plots.",
      status: 0,
    };
  }
}

/**
 * Search deceased persons — live when AUTH_MODE=live + churchId;
 * mock filter over stub occupants otherwise.
 */
export async function searchDeceasedPeople(
  churchId: number | null | undefined,
  query: string,
): Promise<SearchDeceasedResult> {
  const q = query.trim();
  if (!q) {
    return { ok: true, source: authMode === "live" ? "live" : "mock", people: [] };
  }

  if (authMode !== "live") {
    const needle = q.toLowerCase();
    const people = MOCK_CEMETERY_PLOTS.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) &&
        p.name !== "—" &&
        p.status === "occupied",
    ).map((p) => ({
      personId: `mock-${p.id}`,
      name: p.name,
      deathDate: null,
      plotId: p.id,
      plotNumber: p.lot,
      sectionCode: p.section,
    }));
    return { ok: true, source: "mock", people };
  }

  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for deceased search.",
      status: 400,
    };
  }

  try {
    const res = await apiFetch(
      `/api/churches/${String(churchId)}/cemetery/people/search?q=${encodeURIComponent(q)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Deceased search unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    return {
      ok: true,
      source: "live",
      people: unwrapCemeteryPeople(payload),
    };
  } catch {
    return {
      ok: false,
      message: "Network error searching deceased persons.",
      status: 0,
    };
  }
}
