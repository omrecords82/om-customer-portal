import { describe, expect, it } from "vitest";

import {
  computePlotViewBox,
  pathFromPoints,
  plotsWithMapCoords,
  plotStatusFill,
  summarizeRenderGeometry,
} from "./cemeteryMapGeometry";

describe("cemeteryMapGeometry", () => {
  it("filters plots that lack map coords", () => {
    const placed = plotsWithMapCoords([
      {
        id: "1",
        mapX: 10,
        mapY: 20,
        mapW: null,
        mapH: null,
        status: "available",
        lot: "1",
        section: "A",
      },
      {
        id: "2",
        mapX: null,
        mapY: 5,
        mapW: null,
        mapH: null,
        status: "occupied",
        lot: "2",
        section: "A",
      },
    ]);
    expect(placed).toHaveLength(1);
    expect(placed[0]?.id).toBe("1");
  });

  it("computes a padded viewBox from plot extents", () => {
    const view = computePlotViewBox([
      {
        id: "1",
        mapX: 10,
        mapY: 10,
        mapW: 2,
        mapH: 2,
        status: "available",
        lot: "1",
        section: "A",
      },
      {
        id: "2",
        mapX: 20,
        mapY: 30,
        mapW: 2,
        mapH: 2,
        status: "occupied",
        lot: "2",
        section: "B",
      },
    ]);
    expect(view.x).toBe(5);
    expect(view.y).toBe(5);
    expect(view.w).toBeGreaterThan(10);
    expect(view.h).toBeGreaterThan(10);
  });

  it("falls back to geometry viewBox when no coords", () => {
    const view = computePlotViewBox([], { width: 80, height: 90 });
    expect(view).toEqual({ x: 0, y: 0, w: 80, h: 90 });
  });

  it("summarizes render-geometry payload keys", () => {
    const summary = summarizeRenderGeometry({
      success: true,
      data: {
        schemaVersion: 2,
        churchId: 99,
        viewBox: { width: 100, height: 170 },
        plotDefaults: { width: 2.4, height: 2.4 },
        trafficCircle: { center: { x: 1, y: 2 }, radius: 3 },
        roads: {
          spine: [{ x: 0, y: 0 }],
          upper: [{ x: 1, y: 1 }],
        },
        landmarks: { entrance: { x: 1, y: 2 } },
        cameras: { full: { x: 0, y: 0, w: 10, h: 10 } },
      },
    });
    expect(summary).toMatchObject({
      schemaVersion: 2,
      churchId: 99,
      roadPolylineCount: 2,
      landmarkCount: 1,
      cameraCount: 1,
      hasTrafficCircle: true,
    });
    expect(summary?.viewBox).toEqual({ width: 100, height: 170 });
  });

  it("builds SVG path from points", () => {
    expect(pathFromPoints([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe(
      "M 1 2 L 3 4",
    );
    expect(pathFromPoints([])).toBe("");
  });

  it("maps status fills", () => {
    expect(plotStatusFill("occupied")).toMatch(/^#/);
    expect(plotStatusFill("unknown")).toMatch(/^#/);
  });
});
