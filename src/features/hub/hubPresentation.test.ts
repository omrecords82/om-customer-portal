import { describe, expect, it } from "vitest";

import type { HubLiveState } from "./useHubDashboard";
import {
  buildActivityEmptyDescription,
  buildCertificatesNote,
  buildHubSecondaryModules,
  buildHubStatusNote,
  buildHubWelcomeLine,
  buildRecordsThisMonthNote,
  buildSacramentalRecordsNote,
  certificateCountUnavailable,
  dashboardUnavailable,
  formatHubCount,
} from "./hubPresentation";

describe("hubPresentation", () => {
  it("formats counts with loading and null honesty", () => {
    expect(formatHubCount(null, false)).toBe("—");
    expect(formatHubCount(1200, false)).toBe("1,200");
    expect(formatHubCount(null, true)).toBe("…");
  });

  it("builds preview welcome and status copy", () => {
    expect(buildHubWelcomeLine({ liveSession: false })).toMatch(/preview/i);
    expect(
      buildHubStatusNote({
        session: { liveSession: false },
        hub: { status: "idle" },
      }),
    ).toMatch(/Preview mode/i);
  });

  it("builds live loading and error status copy", () => {
    expect(
      buildHubStatusNote({
        session: { liveSession: true, displayName: "Fr. John" },
        hub: { status: "loading" },
      }),
    ).toMatch(/Loading parish dashboard/i);

    expect(
      buildHubStatusNote({
        session: { liveSession: true },
        hub: { status: "error", message: "Network error." },
      }),
    ).toMatch(/Network error/);
  });

  it("uses sacramental totals copy instead of membership wording", () => {
    expect(
      buildSacramentalRecordsNote({
        session: { liveSession: false },
        dashboard: null,
        dashFailed: false,
      }),
    ).toMatch(/Sacramental totals/i);
    expect(
      buildSacramentalRecordsNote({
        session: { liveSession: false },
        dashboard: null,
        dashFailed: false,
      }),
    ).not.toMatch(/Membership/i);
  });

  it("describes live dashboard breakdown when data exists", () => {
    expect(
      buildSacramentalRecordsNote({
        session: { liveSession: true },
        dashboard: {
          totalRecords: 16,
          recordsThisMonth: 3,
          baptisms: 10,
          marriages: 4,
          funerals: 2,
          recentActivity: [],
        },
        dashFailed: false,
      }),
    ).toContain("10 baptisms");
  });

  it("marks dashboard and certificate failures honestly", () => {
    const liveEmpty: HubLiveState = {
      status: "ready",
      source: "live",
      dashboard: null,
      certificatesIssued: null,
      partialErrors: ["Certificate history unavailable (503)."],
      activity: [],
    };

    expect(dashboardUnavailable(liveEmpty, false)).toBe(true);
    expect(certificateCountUnavailable(liveEmpty, false)).toBe(true);
    expect(
      buildRecordsThisMonthNote({
        session: { liveSession: true },
        dashboard: null,
        dashFailed: true,
      }),
    ).toMatch(/unavailable/i);
    expect(
      buildCertificatesNote({
        session: { liveSession: true },
        certificatesIssued: null,
        certFailed: true,
      }),
    ).toMatch(/unavailable/i);
  });

  it("builds activity empty descriptions for preview vs live", () => {
    expect(buildActivityEmptyDescription(false)).toMatch(/live hub events/i);
    expect(buildActivityEmptyDescription(true)).toMatch(/No recent sacramental/i);
  });

  it("lists secondary modules with cemetery disabled by default", () => {
    const modules = buildHubSecondaryModules({ cemeteryEnabled: false });
    const cemetery = modules.find((m) => m.href === "/cemetery");
    expect(cemetery?.availability).toBe("disabled");
    expect(cemetery?.availabilityNote).toMatch(/Disabled by default/i);
  });

  it("marks cemetery preview when feature flag on", () => {
    const cemetery = buildHubSecondaryModules({ cemeteryEnabled: true }).find(
      (m) => m.href === "/cemetery",
    );
    expect(cemetery?.availability).toBe("preview");
  });
});
