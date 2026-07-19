import { Box, Text } from "@mantine/core";
import { useMemo } from "react";

import type { CemeteryPlotRow, CemeteryRenderGeometry } from "./cemeteryApi";
import {
  computePlotViewBox,
  pathFromPoints,
  plotsWithMapCoords,
  plotStatusFill,
  summarizeRenderGeometry,
} from "./cemeteryMapGeometry";

type Props = {
  readonly plots: readonly CemeteryPlotRow[];
  readonly geometry: CemeteryRenderGeometry | null;
  readonly selectedPlotId: string | null;
  readonly onSelectPlot: (plotId: string) => void;
  readonly loading?: boolean;
  readonly note?: string | null;
};

/**
 * Read-only SVG cemetery map shell.
 * Renders plot rects + optional road polylines / traffic circle from render-geometry.
 * Full legacy CemeteryMap (pan/zoom, trees, landmarks, cameras, directions) is deferred.
 */
export function CemeteryReadOnlyMap({
  plots,
  geometry,
  selectedPlotId,
  onSelectPlot,
  loading = false,
  note = null,
}: Props) {
  const summary = useMemo(() => {
    if (!geometry) return null;
    if (geometry.raw != null) {
      return summarizeRenderGeometry({ data: geometry.raw });
    }
    return summarizeRenderGeometry({
      data: {
        schemaVersion: geometry.schemaVersion,
        churchId: geometry.churchId,
        viewBox: geometry.viewBox,
        plotDefaults: geometry.plotDefaults,
        roads: geometry.roads,
        trafficCircle: geometry.trafficCircle
          ? {
              center: geometry.trafficCircle.center,
              radius: geometry.trafficCircle.radius,
            }
          : null,
        landmarks: {},
        cameras: {},
      },
    });
  }, [geometry]);

  const placed = useMemo(() => plotsWithMapCoords(plots), [plots]);

  const view = useMemo(() => {
    const defaults = geometry?.plotDefaults;
    return computePlotViewBox(
      plots,
      geometry?.viewBox,
      defaults?.width ?? 2.4,
      defaults?.height ?? 2.4,
    );
  }, [plots, geometry]);

  const roadPaths = useMemo(() => {
    if (!geometry?.roads) return [] as string[];
    return [
      pathFromPoints(geometry.roads.spine),
      pathFromPoints(geometry.roads.upper),
      pathFromPoints(geometry.roads.newSection),
    ].filter(Boolean);
  }, [geometry]);

  if (loading) {
    return (
      <Text size="sm" c="dimmed" role="status">
        Loading map geometry…
      </Text>
    );
  }

  return (
    <Box>
      <Text size="xs" c="dimmed" mb="xs">
        Read-only shell — select a plot. Full map engine (pan/zoom, landmarks, directions)
        deferred; this view uses SVG plot markers
        {geometry ? " + geometry polylines" : ""}.
      </Text>
      {note ? (
        <Text size="sm" role="status" mb="xs">
          {note}
        </Text>
      ) : null}
      {summary ? (
        <Text size="xs" c="dimmed" mb="sm" component="div">
          Geometry v{summary.schemaVersion}
          {summary.viewBox
            ? ` · viewBox ${String(summary.viewBox.width)}×${String(summary.viewBox.height)}`
            : ""}
          {` · roads ${String(summary.roadPolylineCount)}`}
          {` · landmarks ${String(summary.landmarkCount)}`}
          {` · cameras ${String(summary.cameraCount)}`}
          {summary.hasTrafficCircle ? " · traffic circle" : ""}
          {` · placed plots ${String(placed.length)}/${String(plots.length)}`}
        </Text>
      ) : (
        <Text size="xs" c="dimmed" mb="sm">
          No render-geometry loaded — showing plot coordinates only
          {` (${String(placed.length)} placed of ${String(plots.length)}).`}
        </Text>
      )}

      {placed.length === 0 ? (
        <Text size="sm" c="dimmed">
          No plots with map coordinates to display. Validate plot mapX/mapY for this church.
        </Text>
      ) : (
        <Box
          style={{
            width: "100%",
            maxHeight: 420,
            overflow: "auto",
            borderRadius: 8,
            border: "1px solid var(--mantine-color-gray-3)",
            background: "#6d7f5b",
          }}
        >
          <svg
            role="img"
            aria-label="Cemetery plot map, read-only"
            viewBox={`${String(view.x)} ${String(view.y)} ${String(view.w)} ${String(view.h)}`}
            style={{ width: "100%", height: "min(60vw, 380px)", display: "block" }}
          >
            {geometry?.trafficCircle ? (
              <circle
                cx={geometry.trafficCircle.center.x}
                cy={geometry.trafficCircle.center.y}
                r={geometry.trafficCircle.radius}
                fill="none"
                stroke="#c4b89a"
                strokeWidth={0.6}
                opacity={0.7}
              />
            ) : null}
            {roadPaths.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="#a89878"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            ))}
            {placed.map((p) => {
              if (p.mapX == null || p.mapY == null) return null;
              const pw = p.mapW ?? geometry?.plotDefaults?.width ?? 2.4;
              const ph = p.mapH ?? geometry?.plotDefaults?.height ?? 2.4;
              const x = p.mapX - pw / 2;
              const y = p.mapY - ph / 2;
              const selected = selectedPlotId === p.id;
              return (
                <rect
                  key={p.id}
                  x={x}
                  y={y}
                  width={pw}
                  height={ph}
                  rx={0.2}
                  fill={plotStatusFill(p.status)}
                  stroke={selected ? "#fff" : "rgba(0,0,0,0.35)"}
                  strokeWidth={selected ? 0.45 : 0.15}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    onSelectPlot(p.id);
                  }}
                >
                  <title>
                    {`Section ${p.section} · Lot ${p.lot} · ${p.status}`}
                  </title>
                </rect>
              );
            })}
          </svg>
        </Box>
      )}
    </Box>
  );
}
