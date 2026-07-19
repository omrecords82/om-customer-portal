import { Box, Group, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { AlertCircle, MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import type { CemeteryPlotRow, CemeteryRenderGeometry } from "./cemeteryApi";
import {
  MAP_ZOOM_DEFAULT,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  MAP_ZOOM_STEP,
  PLOT_STATUS_LEGEND,
  clampMapZoom,
  computePlotViewBox,
  pathFromPoints,
  plotsWithMapCoords,
  plotStatusFill,
  summarizeRenderGeometry,
  zoomedViewBox,
} from "./cemeteryMapGeometry";

type Props = {
  readonly plots: readonly CemeteryPlotRow[];
  readonly geometry: CemeteryRenderGeometry | null;
  readonly selectedPlotId: string | null;
  readonly onSelectPlot: (plotId: string) => void;
  readonly loading?: boolean;
  readonly note?: string | null;
  readonly errorMessage?: string | null;
};

/**
 * Read-only SVG cemetery map shell.
 * Renders plot rects + optional road polylines / traffic circle from render-geometry.
 * Light zoom via viewBox; pan via scroll. Full legacy CemeteryMap engine deferred.
 */
export function CemeteryReadOnlyMap({
  plots,
  geometry,
  selectedPlotId,
  onSelectPlot,
  loading = false,
  note = null,
  errorMessage = null,
}: Props) {
  const [zoom, setZoom] = useState(MAP_ZOOM_DEFAULT);

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

  const baseView = useMemo(() => {
    const defaults = geometry?.plotDefaults;
    return computePlotViewBox(
      plots,
      geometry?.viewBox,
      defaults?.width ?? 2.4,
      defaults?.height ?? 2.4,
    );
  }, [plots, geometry]);

  const view = useMemo(() => zoomedViewBox(baseView, zoom), [baseView, zoom]);

  const roadPaths = useMemo(() => {
    if (!geometry?.roads) return [] as string[];
    return [
      pathFromPoints(geometry.roads.spine),
      pathFromPoints(geometry.roads.upper),
      pathFromPoints(geometry.roads.newSection),
    ].filter(Boolean);
  }, [geometry]);

  const selectedPlot = useMemo(
    () => placed.find((p) => p.id === selectedPlotId) ?? null,
    [placed, selectedPlotId],
  );

  function adjustZoom(delta: number) {
    setZoom((current) => clampMapZoom(current + delta));
  }

  if (loading) {
    return (
      <Text size="sm" c="dimmed" role="status">
        Loading map geometry…
      </Text>
    );
  }

  if (errorMessage) {
    return (
      <CardLikeState
        icon={AlertCircle}
        title="Map unavailable"
        description={errorMessage}
        tone="error"
      />
    );
  }

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        Read-only map — select a plot for detail. Scroll to pan; use zoom controls below.
        Landmarks, cameras, and directions remain deferred.
      </Text>
      {note ? (
        <Text size="sm" role="status">
          {note}
        </Text>
      ) : null}
      {summary ? (
        <Text size="xs" c="dimmed" component="div">
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
        <Text size="xs" c="dimmed">
          No render-geometry loaded — showing plot coordinates only
          {` (${String(placed.length)} placed of ${String(plots.length)}).`}
        </Text>
      )}

      <Group gap="md" wrap="wrap" align="center">
        {PLOT_STATUS_LEGEND.map((item) => (
          <Group key={item.status} gap={6} wrap="nowrap">
            <Box
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: item.fill,
                border: "1px solid rgba(0,0,0,0.25)",
              }}
            />
            <Text size="xs" c="dimmed">
              {item.label}
            </Text>
          </Group>
        ))}
      </Group>

      {placed.length === 0 ? (
        <CardLikeState
          icon={MapPin}
          title="No mappable plots"
          description="Plots need validated mapX/mapY coordinates before the map can render markers. The list and search below still work when cemetery data is available."
        />
      ) : (
        <>
          <Group gap="xs" wrap="wrap">
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Zoom in on cemetery map"
              isDisabled={zoom >= MAP_ZOOM_MAX}
              onAction={() => {
                adjustZoom(MAP_ZOOM_STEP);
              }}
            >
              <Plus size={14} aria-hidden />
            </Button>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Zoom out on cemetery map"
              isDisabled={zoom <= MAP_ZOOM_MIN}
              onAction={() => {
                adjustZoom(-MAP_ZOOM_STEP);
              }}
            >
              <Minus size={14} aria-hidden />
            </Button>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Reset cemetery map zoom"
              isDisabled={zoom === MAP_ZOOM_DEFAULT}
              onAction={() => {
                setZoom(MAP_ZOOM_DEFAULT);
              }}
            >
              <RotateCcw size={14} aria-hidden />
            </Button>
            <Text size="xs" c="dimmed">
              Zoom {Math.round(zoom * 100)}%
            </Text>
          </Group>

          <Box
            style={{
              width: "100%",
              maxHeight: 420,
              overflow: "auto",
              borderRadius: 8,
              border: "1px solid var(--mantine-color-gray-3)",
              background: "#6d7f5b",
            }}
            onWheel={(event) => {
              if (!event.ctrlKey && !event.metaKey) return;
              event.preventDefault();
              adjustZoom(event.deltaY < 0 ? MAP_ZOOM_STEP : -MAP_ZOOM_STEP);
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
                    tabIndex={0}
                    role="button"
                    aria-label={`Section ${p.section}, lot ${p.lot}, ${p.status}`}
                    aria-pressed={selected}
                    style={{ cursor: "pointer", outline: "none" }}
                    onClick={() => {
                      onSelectPlot(p.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectPlot(p.id);
                      }
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

          <Text size="xs" c="dimmed" aria-live="polite">
            {selectedPlot
              ? `Selected: Section ${selectedPlot.section}, lot ${selectedPlot.lot} (${selectedPlot.status}).`
              : "No plot selected."}
          </Text>
        </>
      )}
    </Stack>
  );
}

function CardLikeState({
  icon: Icon,
  title,
  description,
  tone = "neutral",
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  tone?: "neutral" | "error";
}) {
  return (
    <Box
      p="md"
      style={{
        borderRadius: 8,
        border:
          tone === "error"
            ? "1px solid var(--mantine-color-red-3)"
            : "1px solid var(--mantine-color-gray-3)",
        background:
          tone === "error"
            ? "var(--mantine-color-red-0)"
            : "var(--mantine-color-gray-0)",
      }}
    >
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <Box
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color:
              tone === "error"
                ? "var(--mantine-color-red-7)"
                : "var(--mantine-color-dimmed)",
            background: "var(--mantine-color-default-hover)",
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </Box>
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {title}
          </Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
}
