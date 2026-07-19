import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../../auth/config", () => ({
  authMode: "live",
  requireAuth: false,
}));

import { apiFetch } from "../../auth/apiFetch";
import {
  fetchChurchMetrics,
  unwrapChartsSummaryLabels,
  unwrapMetricsDashboard,
} from "./metricsApi";

const mockedApiFetch = vi.mocked(apiFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("metricsApi", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("unwraps dashboard KPI counts and distribution", () => {
    const slice = unwrapMetricsDashboard({
      success: true,
      data: {
        counts: { baptisms: 10, marriages: 4, funerals: 2, total: 16 },
        typeDistribution: [
          { name: "Baptisms", value: 10 },
          { name: "Marriages", value: 4 },
          { name: "Funerals", value: 2 },
        ],
        yearOverYear: {
          currentYear: 2026,
          previousYear: 2025,
          current: 5,
          previous: 4,
          changePercent: 25,
        },
        completeness: 88,
        dateRange: { earliest: 1990, latest: 2026 },
      },
    });
    expect(slice).not.toBeNull();
    expect(slice?.kpis[0]?.value).toBe("16");
    expect(slice?.kpis[0]?.note).toContain("+25%");
    expect(slice?.distribution).toHaveLength(3);
    expect(slice?.seriesNotes.some((n) => n.includes("1990"))).toBe(true);
  });

  it("builds charts summary label notes", () => {
    const { ok, notes } = unwrapChartsSummaryLabels({
      success: true,
      data: {
        sacramentsByYear: [
          { year: 2020, baptism: 1, marriage: 0, funeral: 0 },
          { year: 2024, baptism: 2, marriage: 1, funeral: 0 },
        ],
        byPriest: [{ name: "Fr. John", count: 12 }],
      },
    });
    expect(ok).toBe(true);
    expect(notes.some((n) => n.includes("2020"))).toBe(true);
    expect(notes.some((n) => n.includes("Fr. John"))).toBe(true);
  });

  it("loads live metrics with charts notes", async () => {
    mockedApiFetch.mockImplementation((url) => {
      if (url.includes("/dashboard")) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              counts: { baptisms: 3, marriages: 1, funerals: 0, total: 4 },
              typeDistribution: [],
              yearOverYear: { changePercent: 0, currentYear: 2026 },
            },
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          success: true,
          data: {
            sacramentsByYear: [{ year: 2025, baptism: 1, marriage: 0, funeral: 0 }],
            byPriest: [],
          },
        }),
      );
    });

    const result = await fetchChurchMetrics(46);
    expect(result.ok).toBe(true);
    if (!result.ok || result.source !== "live") return;
    expect(result.metrics.kpis[0]?.value).toBe("4");
    expect(result.metrics.chartsEnabled).toBe(true);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/churches/46/dashboard",
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/churches/46/charts/summary",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("keeps KPIs when charts summary is forbidden", async () => {
    mockedApiFetch.mockImplementation((url) => {
      if (url.includes("/dashboard")) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              counts: { baptisms: 1, marriages: 0, funerals: 0, total: 1 },
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ error: "disabled" }, 403));
    });

    const result = await fetchChurchMetrics(46);
    expect(result.ok).toBe(true);
    if (!result.ok || result.source !== "live") return;
    expect(result.metrics.kpis[0]?.value).toBe("1");
    expect(result.metrics.chartsEnabled).toBe(false);
    expect(result.partialErrors.some((e) => e.includes("OM Charts"))).toBe(
      true,
    );
  });

  it("rejects missing church context", async () => {
    const result = await fetchChurchMetrics(null);
    expect(result.ok).toBe(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("surfaces hard dashboard errors", async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse({ error: "nope" }, 500));
    const result = await fetchChurchMetrics(46);
    expect(result.ok).toBe(false);
  });
});
