import { describe, expect, it } from "vitest";

import { buildAuthPilotDiagnostics } from "./authPilotDiagnostics";

describe("buildAuthPilotDiagnostics", () => {
  it("returns no lines in mock mode", () => {
    expect(
      buildAuthPilotDiagnostics({
        authMode: "mock",
        requireAuth: false,
        ready: true,
        isAuthenticated: true,
        user: null,
        parishSource: "preview",
        parishLoading: false,
        parishError: null,
      }),
    ).toEqual([]);
  });

  it("flags missing church context in live mode", () => {
    const lines = buildAuthPilotDiagnostics({
      authMode: "live",
      requireAuth: true,
      ready: true,
      isAuthenticated: true,
      user: {
        id: 1,
        email: "pilot@example.com",
        displayName: "Pilot",
        role: "church_admin",
        initials: "P",
        churchId: null,
      },
      parishSource: "fallback",
      parishLoading: false,
      parishError: "No church context",
    });

    const church = lines.find((l) => l.label === "Church context (session)");
    expect(church?.value).toBe("missing");
    expect(church?.ok).toBe(false);
  });

  it("passes when live session and parish settings load", () => {
    const lines = buildAuthPilotDiagnostics({
      authMode: "live",
      requireAuth: true,
      ready: true,
      isAuthenticated: true,
      user: {
        id: 42,
        email: "admin@example.com",
        displayName: "Admin",
        role: "church_admin",
        initials: "A",
        churchId: 99,
      },
      parishSource: "live",
      parishLoading: false,
      parishError: null,
    });

    expect(lines.find((l) => l.label === "Church context (session)")).toMatchObject({
      value: "99",
      ok: true,
    });
    expect(lines.find((l) => l.label === "Parish settings API")).toMatchObject({
      value: "live",
      ok: true,
    });
  });
});
