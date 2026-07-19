/**
 * Pure helpers for Wave G read-only cemetery map shell.
 * Full pan/zoom CemeteryMap engine (roads trees landmarks cameras) stays deferred.
 */

export type MapCoordPlot = {
  readonly id: string;
  readonly mapX: number | null;
  readonly mapY: number | null;
  readonly mapW: number | null;
  readonly mapH: number | null;
  readonly status: string;
  readonly lot: string;
  readonly section: string;
};

export type SvgViewBox = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type GeometrySummary = {
  readonly schemaVersion: number;
  readonly churchId: number | null;
  readonly viewBox: { readonly width: number; readonly height: number } | null;
  readonly plotDefaultSize: { readonly width: number; readonly height: number } | null;
  readonly roadPolylineCount: number;
  readonly landmarkCount: number;
  readonly cameraCount: number;
  readonly hasTrafficCircle: boolean;
};

const DEFAULT_PLOT_W = 2.4;
const DEFAULT_PLOT_H = 2.4;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Plots that have placeable map coordinates. */
export function plotsWithMapCoords(
  plots: readonly MapCoordPlot[],
): readonly MapCoordPlot[] {
  return plots.filter(
    (p) => p.mapX != null && p.mapY != null && Number.isFinite(p.mapX) && Number.isFinite(p.mapY),
  );
}

/**
 * Compute an SVG viewBox that fits plot extents (with padding).
 * Falls back to geometry viewBox when no plots have coords.
 */
export function computePlotViewBox(
  plots: readonly MapCoordPlot[],
  fallback?: { readonly width: number; readonly height: number } | null,
  defaultW = DEFAULT_PLOT_W,
  defaultH = DEFAULT_PLOT_H,
): SvgViewBox {
  const placed = plotsWithMapCoords(plots);
  if (placed.length === 0) {
    const w = fallback?.width ?? 100;
    const h = fallback?.height ?? 100;
    return { x: 0, y: 0, w, h };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of placed) {
    if (p.mapX == null || p.mapY == null) continue;
    const pw = p.mapW ?? defaultW;
    const ph = p.mapH ?? defaultH;
    const x = p.mapX;
    const y = p.mapY;
    minX = Math.min(minX, x - pw / 2);
    minY = Math.min(minY, y - ph / 2);
    maxX = Math.max(maxX, x + pw / 2);
    maxY = Math.max(maxY, y + ph / 2);
  }
  const pad = 4;
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 8),
    h: Math.max(maxY - minY + pad * 2, 8),
  };
}

/** Normalize optional numeric map fields from API rows. */
export function readMapCoord(value: unknown): number | null {
  return asFiniteNumber(value);
}

/** Summarize live render-geometry for the read-only shell (no full renderer). */
export function summarizeRenderGeometry(payload: unknown): GeometrySummary | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const schemaVersion = asFiniteNumber(data.schemaVersion) ?? 0;
  const churchId = asFiniteNumber(data.churchId);

  let viewBox: GeometrySummary["viewBox"] = null;
  if (data.viewBox && typeof data.viewBox === "object") {
    const vb = data.viewBox as Record<string, unknown>;
    const width = asFiniteNumber(vb.width);
    const height = asFiniteNumber(vb.height);
    if (width != null && height != null) {
      viewBox = { width, height };
    }
  }

  let plotDefaultSize: GeometrySummary["plotDefaultSize"] = null;
  if (data.plotDefaults && typeof data.plotDefaults === "object") {
    const pd = data.plotDefaults as Record<string, unknown>;
    const width = asFiniteNumber(pd.width);
    const height = asFiniteNumber(pd.height);
    if (width != null && height != null) {
      plotDefaultSize = { width, height };
    }
  }

  let roadPolylineCount = 0;
  if (data.roads && typeof data.roads === "object") {
    const roads = data.roads as Record<string, unknown>;
    for (const key of ["spine", "upper", "newSection"] as const) {
      if (Array.isArray(roads[key])) roadPolylineCount += 1;
    }
  }

  const landmarkCount =
    data.landmarks && typeof data.landmarks === "object"
      ? Object.keys(data.landmarks).length
      : 0;
  const cameraCount =
    data.cameras && typeof data.cameras === "object"
      ? Object.keys(data.cameras).length
      : 0;
  const hasTrafficCircle = Boolean(
    data.trafficCircle && typeof data.trafficCircle === "object",
  );

  return {
    schemaVersion,
    churchId,
    viewBox,
    plotDefaultSize,
    roadPolylineCount,
    landmarkCount,
    cameraCount,
    hasTrafficCircle,
  };
}

/** Status → SVG fill for the read-only shell (not brand-tokenized; map is app-owned). */
export function plotStatusFill(status: string): string {
  switch (status.toLowerCase()) {
    case "occupied":
      return "#3d5a80";
    case "reserved":
      return "#c47d3a";
    case "available":
      return "#4a7c59";
    default:
      return "#6b7280";
  }
}

/** Build SVG path `d` from polyline points. */
export function pathFromPoints(
  pts: readonly { readonly x: number; readonly y: number }[],
): string {
  if (pts.length === 0) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${String(p.x)} ${String(p.y)}`)
    .join(" ");
}

export function readPolyline(
  value: unknown,
): readonly { readonly x: number; readonly y: number }[] {
  if (!Array.isArray(value)) return [];
  const out: { x: number; y: number }[] = [];
  for (const pt of value) {
    if (!pt || typeof pt !== "object") continue;
    const r = pt as Record<string, unknown>;
    const x = asFiniteNumber(r.x);
    const y = asFiniteNumber(r.y);
    if (x == null || y == null) continue;
    out.push({ x, y });
  }
  return out;
}
