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
  fetchCertificateIssuedCount,
  fetchChurchDashboard,
  fetchHubLiveData,
} from "./hubApi";

const mockedApiFetch = vi.mocked(apiFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("hubApi", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("parses dashboard counts, monthly, and activity", async () => {
    const ym = (() => {
      const now = new Date();
      return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          counts: { baptisms: 10, marriages: 4, funerals: 2, total: 16 },
          monthlyActivity: [
            { month: ym, baptism: 1, marriage: 2, funeral: 0 },
          ],
          recentActivity: [
            { name: "Anna", type: "baptism", date: "2026-07-01" },
            { name: "Ioan & Maria", type: "marriage", date: "2026-06-15" },
          ],
        },
      }),
    );

    const result = await fetchChurchDashboard(46);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dashboard.totalRecords).toBe(16);
    expect(result.dashboard.recordsThisMonth).toBe(3);
    expect(result.dashboard.recentActivity).toHaveLength(2);
    expect(result.dashboard.recentActivity[0]?.type).toBe("baptism");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/churches/46/dashboard",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("counts certificate history rows", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({ history: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
    );
    const result = await fetchCertificateIssuedCount(46);
    expect(result).toEqual({ ok: true, count: 3 });
  });

  it("aggregates dashboard + certificate history with partial errors", async () => {
    mockedApiFetch.mockImplementation((url) => {
      if (url.includes("/dashboard")) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              counts: { baptisms: 1, marriages: 0, funerals: 0, total: 1 },
              monthlyActivity: [],
              recentActivity: [],
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ error: "down" }, 503));
    });

    const result = await fetchHubLiveData(46);
    expect(result.ok).toBe(true);
    if (!result.ok || result.source !== "live") return;
    expect(result.dashboard?.totalRecords).toBe(1);
    expect(result.certificatesIssued).toBeNull();
    expect(result.partialErrors.some((e) => e.includes("Certificate"))).toBe(
      true,
    );
  });

  it("rejects invalid church id", async () => {
    const result = await fetchChurchDashboard(0);
    expect(result.ok).toBe(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("returns hard error when both endpoints fail", async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse({ error: "nope" }, 500));
    const result = await fetchHubLiveData(46);
    expect(result.ok).toBe(false);
  });
});
