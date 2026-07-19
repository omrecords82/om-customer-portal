/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authConfig = vi.hoisted(() => {
  const state: { authMode: "live" | "mock"; requireAuth: boolean } = {
    authMode: "live",
    requireAuth: true,
  };
  return state;
});

vi.mock("./config", () => ({
  get authMode() {
    return authConfig.authMode;
  },
  get requireAuth() {
    return authConfig.requireAuth;
  },
}));

vi.mock("./authApi", () => ({
  logoutSession: vi.fn(() => Promise.resolve()),
}));

import { logoutSession } from "./authApi";
import { apiFetch } from "./apiFetch";
import { getSafePortalNext, toAbsolutePortalPath } from "./safeNext";

describe("apiFetch 401 redirect", () => {
  const assign = vi.fn();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authConfig.authMode = "live";
    authConfig.requireAuth = true;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", {
      pathname: "/portal2/records",
      search: "?type=baptism",
      hash: "",
      assign,
    });
    assign.mockReset();
    vi.mocked(logoutSession).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears session and redirects to login with nested next on 401", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const res = await apiFetch("/api/churches/46/dashboard");

    expect(res.status).toBe(401);
    expect(logoutSession).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledOnce();

    const loginUrl = String(assign.mock.calls[0]?.[0] ?? "");
    expect(loginUrl).toBe(
      toAbsolutePortalPath(
        `/auth/login?next=${encodeURIComponent("/portal2/records?type=baptism")}`,
      ),
    );

    const nextParam = new URL(loginUrl, "http://localhost").searchParams.get("next");
    expect(nextParam).toBe("/portal2/records?type=baptism");
    expect(getSafePortalNext(`next=${encodeURIComponent(nextParam ?? "")}`)).toBe(
      "/records?type=baptism",
    );
  });

  it("does not redirect when requireAuth is false", async () => {
    authConfig.requireAuth = false;
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await apiFetch("/api/churches/46/dashboard");

    expect(logoutSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not redirect when skipAuthRedirect is set", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await apiFetch("/api/auth/check", { skipAuthRedirect: true });

    expect(logoutSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not redirect in mock auth mode", async () => {
    authConfig.authMode = "mock";
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await apiFetch("/api/churches/46/dashboard");

    expect(logoutSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
