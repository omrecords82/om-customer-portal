import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import { readMapCoord } from "./cemeteryMapGeometry";

/**
 * Wave G cemetery read client.
 * Parity: legacy `/portal/cemetery/*` → `/api/churches/:churchId/cemetery/*`
 *   - GET /plots — plot list (includes mapX/mapY when present)
 *   - GET /plots/:plotId — plot detail + occupants
 *   - GET /people/search?q= — deceased person search
 *   - GET /render-geometry — validated map world (roads/viewBox) when mapEnabled
 * No geometry editing / digitizer endpoints.
 */

export type CemeteryPlotRow = {
  readonly id: string;
  readonly section: string;
  readonly lot: string;
  readonly status: string;
  readonly name: string;
  readonly rowNo: string | null;
  readonly mapX: number | null;
  readonly mapY: number | null;
  readonly mapW: number | null;
  readonly mapH: number | null;
  readonly occupantCount: number | null;
};

export type CemeteryPersonHit = {
  readonly personId: string;
  readonly name: string;
  readonly deathDate: string | null;
  readonly plotId: string | null;
  readonly plotNumber: string | null;
  readonly sectionCode: string | null;
};

export type CemeteryOccupant = {
  readonly intermentId: string;
  readonly personId: string | null;
  readonly name: string;
  readonly birthDate: string | null;
  readonly deathDate: string | null;
  readonly burialDate: string | null;
};

export type CemeteryPlotDetail = {
  readonly id: string;
  readonly section: string;
  readonly sectionName: string | null;
  readonly lot: string;
  readonly status: string;
  readonly rowNo: string | null;
  readonly familyCrest: string | null;
  readonly plotKind: string | null;
  readonly notes: string | null;
  readonly occupants: readonly CemeteryOccupant[];
};

/** Subset of legacy CemeteryRenderGeometry used by the read-only shell. */
export type CemeteryRenderGeometry = {
  readonly schemaVersion: number;
  readonly churchId: number | null;
  readonly viewBox: { readonly width: number; readonly height: number } | null;
  readonly plotDefaults: { readonly width: number; readonly height: number } | null;
  readonly roads: {
    readonly spine: readonly { readonly x: number; readonly y: number }[];
    readonly upper: readonly { readonly x: number; readonly y: number }[];
    readonly newSection: readonly { readonly x: number; readonly y: number }[];
  } | null;
  readonly trafficCircle: {
    readonly center: { readonly x: number; readonly y: number };
    readonly radius: number;
  } | null;
  readonly raw: unknown;
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

export type FetchRenderGeometryResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly geometry: CemeteryRenderGeometry;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type FetchPlotDetailResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly detail: CemeteryPlotDetail;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

/** Preview stub rows — never presented as live church data. Includes map coords for SVG shell. */
export const MOCK_CEMETERY_PLOTS: readonly CemeteryPlotRow[] = [
  {
    id: "p1",
    section: "A",
    lot: "12",
    status: "occupied",
    name: "Kozlov family",
    rowNo: "1",
    mapX: 20,
    mapY: 30,
    mapW: 2.4,
    mapH: 2.4,
    occupantCount: 2,
  },
  {
    id: "p2",
    section: "A",
    lot: "14",
    status: "available",
    name: "—",
    rowNo: "1",
    mapX: 24,
    mapY: 30,
    mapW: 2.4,
    mapH: 2.4,
    occupantCount: 0,
  },
  {
    id: "p3",
    section: "B",
    lot: "3",
    status: "reserved",
    name: "Petrov",
    rowNo: "2",
    mapX: 40,
    mapY: 55,
    mapW: 2.4,
    mapH: 2.4,
    occupantCount: 1,
  },
];

/** Neutral preview geometry — no real church id. */
export const MOCK_RENDER_GEOMETRY: CemeteryRenderGeometry = {
  schemaVersion: 1,
  churchId: null,
  viewBox: { width: 80, height: 90 },
  plotDefaults: { width: 2.4, height: 2.4 },
  roads: {
    spine: [
      { x: 40, y: 10 },
      { x: 40, y: 80 },
    ],
    upper: [
      { x: 40, y: 25 },
      { x: 20, y: 25 },
    ],
    newSection: [],
  },
  trafficCircle: { center: { x: 40, y: 45 }, radius: 8 },
  raw: null,
};

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

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatPersonName(first: unknown, last: unknown): string {
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

function readPoints(
  value: unknown,
): readonly { readonly x: number; readonly y: number }[] {
  if (!Array.isArray(value)) return [];
  const out: { x: number; y: number }[] = [];
  for (const pt of value) {
    if (!pt || typeof pt !== "object") continue;
    const r = pt as Record<string, unknown>;
    const x = readMapCoord(r.x);
    const y = readMapCoord(r.y);
    if (x == null || y == null) continue;
    out.push({ x, y });
  }
  return out;
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
      mapX: readMapCoord(r.mapX),
      mapY: readMapCoord(r.mapY),
      mapW: readMapCoord(r.mapW),
      mapH: readMapCoord(r.mapH),
      occupantCount: asCount(r.occupantCount),
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

/** Pure map of GET /render-geometry payload. */
export function unwrapCemeteryRenderGeometry(
  payload: unknown,
): CemeteryRenderGeometry | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  if (typeof data.error === "string" && data.error) return null;

  const schemaVersion = readMapCoord(data.schemaVersion) ?? 0;
  const churchId = readMapCoord(data.churchId);

  let viewBox: CemeteryRenderGeometry["viewBox"] = null;
  if (data.viewBox && typeof data.viewBox === "object") {
    const vb = data.viewBox as Record<string, unknown>;
    const width = readMapCoord(vb.width);
    const height = readMapCoord(vb.height);
    if (width != null && height != null) {
      viewBox = { width, height };
    }
  }

  let plotDefaults: CemeteryRenderGeometry["plotDefaults"] = null;
  if (data.plotDefaults && typeof data.plotDefaults === "object") {
    const pd = data.plotDefaults as Record<string, unknown>;
    const width = readMapCoord(pd.width);
    const height = readMapCoord(pd.height);
    if (width != null && height != null) {
      plotDefaults = { width, height };
    }
  }

  let roads: CemeteryRenderGeometry["roads"] = null;
  if (data.roads && typeof data.roads === "object") {
    const rd = data.roads as Record<string, unknown>;
    roads = {
      spine: readPoints(rd.spine),
      upper: readPoints(rd.upper),
      newSection: readPoints(rd.newSection),
    };
  }

  let trafficCircle: CemeteryRenderGeometry["trafficCircle"] = null;
  if (data.trafficCircle && typeof data.trafficCircle === "object") {
    const tc = data.trafficCircle as Record<string, unknown>;
    const center =
      tc.center && typeof tc.center === "object"
        ? (tc.center as Record<string, unknown>)
        : null;
    const cx = center ? readMapCoord(center.x) : null;
    const cy = center ? readMapCoord(center.y) : null;
    const radius = readMapCoord(tc.radius);
    if (cx != null && cy != null && radius != null) {
      trafficCircle = { center: { x: cx, y: cy }, radius };
    }
  }

  return {
    schemaVersion,
    churchId,
    viewBox,
    plotDefaults,
    roads,
    trafficCircle,
    raw: data,
  };
}

/** Pure map of GET /plots/:plotId payload. */
export function unwrapCemeteryPlotDetail(
  payload: unknown,
): CemeteryPlotDetail | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const id = asId(data.id ?? data.plotId);
  if (!id) return null;

  const occupantsRaw = Array.isArray(data.occupants) ? data.occupants : [];
  const occupants: CemeteryOccupant[] = [];
  for (const row of occupantsRaw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const intermentId = asId(o.intermentId ?? o.id);
    if (!intermentId) continue;
    const display = asString(o.displayName).trim();
    occupants.push({
      intermentId,
      personId: asId(o.personId),
      name: display || formatPersonName(o.firstName, o.lastName),
      birthDate: formatDate(o.birthDate),
      deathDate: formatDate(o.deathDate),
      burialDate: formatDate(o.burialDate),
    });
  }

  return {
    id,
    section: asString(data.sectionCode ?? data.section, "—") || "—",
    sectionName: asString(data.sectionName).trim() || null,
    lot: asString(data.plotNumber ?? data.displayNumbers ?? data.lot, "—") || "—",
    status: asString(data.status, "unknown").toLowerCase() || "unknown",
    rowNo: asString(data.rowNo).trim() || null,
    familyCrest: asString(data.familyCrest).trim() || null,
    plotKind: asString(data.plotKind).trim() || null,
    notes: asString(data.notes).trim() || null,
    occupants,
  };
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

/**
 * Load render-geometry when live + churchId; mock shell otherwise.
 * Call only when cemetery.mapEnabled (page gates this).
 */
export async function fetchCemeteryRenderGeometry(
  churchId?: number | null,
): Promise<FetchRenderGeometryResult> {
  if (authMode !== "live") {
    return { ok: true, source: "mock", geometry: MOCK_RENDER_GEOMETRY };
  }
  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for cemetery map geometry.",
      status: 400,
    };
  }

  try {
    const res = await apiFetch(
      `/api/churches/${String(churchId)}/cemetery/render-geometry`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Map geometry unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    const geometry = unwrapCemeteryRenderGeometry(payload);
    if (!geometry) {
      return {
        ok: false,
        message: "Map geometry payload was empty or invalid.",
        status: 404,
      };
    }
    return { ok: true, source: "live", geometry };
  } catch {
    return {
      ok: false,
      message: "Network error loading map geometry.",
      status: 0,
    };
  }
}

/**
 * Load plot detail (occupants / associated interments) for the detail panel.
 */
export async function fetchCemeteryPlotDetail(
  churchId: number | null | undefined,
  plotId: string,
): Promise<FetchPlotDetailResult> {
  const id = plotId.trim();
  if (!id) {
    return { ok: false, message: "Plot id required.", status: 400 };
  }

  if (authMode !== "live") {
    const stub = MOCK_CEMETERY_PLOTS.find((p) => p.id === id);
    if (!stub) {
      return { ok: false, message: "Plot not found in preview stub.", status: 404 };
    }
    return {
      ok: true,
      source: "mock",
      detail: {
        id: stub.id,
        section: stub.section,
        sectionName: `Section ${stub.section}`,
        lot: stub.lot,
        status: stub.status,
        rowNo: stub.rowNo,
        familyCrest: stub.name !== "—" ? stub.name.split(" ")[0] ?? null : null,
        plotKind: "grave",
        notes: null,
        occupants:
          stub.status === "occupied" || stub.status === "reserved"
            ? [
                {
                  intermentId: `mock-i-${stub.id}`,
                  personId: `mock-person-${stub.id}`,
                  name: stub.name,
                  birthDate: null,
                  deathDate: null,
                  burialDate: null,
                },
              ]
            : [],
      },
    };
  }

  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for plot detail.",
      status: 400,
    };
  }

  try {
    const res = await apiFetch(
      `/api/churches/${String(churchId)}/cemetery/plots/${encodeURIComponent(id)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Plot detail unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const payload: unknown = await res.json().catch(() => null);
    const detail = unwrapCemeteryPlotDetail(payload);
    if (!detail) {
      return {
        ok: false,
        message: "Plot detail payload was empty or invalid.",
        status: 404,
      };
    }
    return { ok: true, source: "live", detail };
  } catch {
    return {
      ok: false,
      message: "Network error loading plot detail.",
      status: 0,
    };
  }
}
