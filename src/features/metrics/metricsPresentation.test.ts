import { describe, expect, it } from "vitest";

import type { MetricsSlice } from "./metricsApi";
import {
  buildChartsDeferredNote,
  buildDistributionEmptyCopy,
  buildMetricsEmptyKpiCopy,
  buildMetricsStatusNote,
  formatMetricsCount,
  metricsAllZero,
  metricsSourceBadgeLabel,
  METRICS_SOURCE_MODULES,
} from "./metricsPresentation";
import type { MetricsLiveState } from "./useMetricsDashboard";

const sampleMetrics: MetricsSlice = {
  kpis: [
    { label: "Total sacraments", value: "16", note: "+25% vs prior year" },
    { label: "Baptisms", value: "10", note: "2026 calendar totals" },
    { label: "Marriages", value: "4", note: "2026 calendar totals" },
    { label: "Funerals", value: "2", note: "2026 calendar totals" },
  ],
  distribution: [
    { label: "Baptisms", value: "10" },
    { label: "Marriages", value: "4" },
    { label: "Funerals", value: "2" },
  ],
  seriesNotes: ["Record span: 1990–2026"],
  chartsEnabled: true,
};

describe("metricsPresentation", () => {
  it("formats counts with loading honesty", () => {
    expect(formatMetricsCount(null, false)).toBe("—");
    expect(formatMetricsCount("1,200", false)).toBe("1,200");
    expect(formatMetricsCount(null, true)).toBe("…");
  });

  it("builds preview and loading status copy", () => {
    expect(
      buildMetricsStatusNote({
        session: { liveSession: false },
        state: { status: "idle" },
      }),
    ).toMatch(/Preview mode/i);

    expect(
      buildMetricsStatusNote({
        session: { liveSession: true, churchId: 46 },
        state: { status: "loading" },
      }),
    ).toMatch(/Loading sacramental metrics/i);
  });

  it("builds live and error status copy", () => {
    expect(
      buildMetricsStatusNote({
        session: { liveSession: true },
        state: {
          status: "ready",
          source: "live",
          metrics: sampleMetrics,
          partialErrors: [],
          emptyNote: null,
        },
      }),
    ).toMatch(/Live metrics/i);

    expect(
      buildMetricsStatusNote({
        session: { liveSession: true },
        state: { status: "error", message: "Network error." },
      }),
    ).toMatch(/Network error/);
  });

  it("detects all-zero metrics", () => {
    expect(metricsAllZero(sampleMetrics)).toBe(false);
    expect(
      metricsAllZero({
        ...sampleMetrics,
        kpis: sampleMetrics.kpis.map((k) => ({ ...k, value: "0" })),
        distribution: sampleMetrics.distribution.map((d) => ({
          ...d,
          value: "0",
        })),
      }),
    ).toBe(true);
  });

  it("builds honest empty KPI copy for preview and error", () => {
    const preview: MetricsLiveState = {
      status: "ready",
      source: "preview",
      metrics: null,
      partialErrors: [],
      emptyNote: null,
    };
    expect(buildMetricsEmptyKpiCopy({ state: preview, loading: false }).title).toBe(
      "Preview mode",
    );

    expect(
      buildMetricsEmptyKpiCopy({
        state: { status: "error", message: "Church context required." },
        loading: false,
      }).title,
    ).toBe("KPIs unavailable");
  });

  it("labels source badge for loading, live, and preview", () => {
    expect(
      metricsSourceBadgeLabel({ status: "loading" }, true),
    ).toBe("Loading…");
    expect(
      metricsSourceBadgeLabel(
        {
          status: "ready",
          source: "live",
          metrics: sampleMetrics,
          partialErrors: [],
          emptyNote: null,
        },
        false,
      ),
    ).toBe("Live");
    expect(
      metricsSourceBadgeLabel(
        {
          status: "ready",
          source: "preview",
          metrics: null,
          partialErrors: [],
          emptyNote: null,
        },
        false,
      ),
    ).toBe("Preview");
  });

  it("describes charts deferral without fake reports", () => {
    expect(buildChartsDeferredNote(true)).toMatch(/deferred/i);
    expect(buildChartsDeferredNote(false)).toMatch(/OM Charts/i);
  });

  it("lists source modules with hub and records links", () => {
    expect(METRICS_SOURCE_MODULES.some((m) => m.href === "/")).toBe(true);
    expect(METRICS_SOURCE_MODULES.some((m) => m.href === "/records")).toBe(true);
    expect(
      buildDistributionEmptyCopy({
        state: {
          status: "ready",
          source: "preview",
          metrics: null,
          partialErrors: [],
          emptyNote: null,
        },
        loading: false,
      }),
    ).toMatch(/live dashboard data/i);
  });
});
