import { authMode } from "./config";
import type { LoginCredentials, LoginResult, PortalUser } from "./types";
import { MOCK_PILOT_USER, portalUserFromPayload } from "./userFromPayload";
import { toAbsolutePortalPath } from "./safeNext";

const MOCK_SESSION_KEY = "om_portal2_mock_session";
const MOCK_SIGNED_OUT_KEY = "om_portal2_mock_signed_out";

function readMockSession(): PortalUser | null {
  try {
    const raw = sessionStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return portalUserFromPayload(parsed);
  } catch {
    return null;
  }
}

function writeMockSession(user: PortalUser | null): void {
  if (!user) {
    sessionStorage.removeItem(MOCK_SESSION_KEY);
    sessionStorage.setItem(MOCK_SIGNED_OUT_KEY, "1");
    return;
  }
  sessionStorage.removeItem(MOCK_SIGNED_OUT_KEY);
  sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
}

function messageFromPayload(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as { message?: unknown; error?: unknown };
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }
  return fallback;
}

export async function checkSession(): Promise<PortalUser | null> {
  if (authMode === "mock") {
    if (sessionStorage.getItem(MOCK_SIGNED_OUT_KEY) === "1") {
      return null;
    }
    return readMockSession() ?? MOCK_PILOT_USER;
  }

  const headers: HeadersInit = { Accept: "application/json" };
  const token = localStorage.getItem("access_token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/auth/check", {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    authenticated?: boolean;
    user?: unknown;
  } | null;

  if (!data?.authenticated || !data.user || typeof data.user !== "object") {
    return null;
  }

  return portalUserFromPayload(data.user);
}

export async function loginWithCredentials(
  credentials: LoginCredentials,
  nextAppPath: string,
): Promise<LoginResult> {
  if (!credentials.username.trim() || !credentials.password) {
    return { kind: "error", message: "Email and password are required." };
  }

  if (authMode === "mock") {
    const user: PortalUser = {
      ...MOCK_PILOT_USER,
      email: credentials.username.trim(),
      displayName: credentials.username.includes("@")
        ? credentials.username.split("@")[0] ?? MOCK_PILOT_USER.displayName
        : credentials.username.trim(),
      initials: credentials.username.trim().slice(0, 2).toUpperCase() || "PA",
    };
    writeMockSession(user);
    return { kind: "authenticated", user };
  }

  const next = toAbsolutePortalPath(nextAppPath);
  const body: Record<string, string> = {
    username: credentials.username.trim(),
    password: credentials.password,
  };
  if (credentials.otp?.trim()) {
    body.otp = credentials.otp.trim();
  }

  const res = await fetch(
    `/api/auth/oidc/orthodoxmetrics/credentials?next=${encodeURIComponent(next)}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    setup_url?: string;
    redirect_url?: string;
    access_token?: string;
    refresh_token?: string;
    user?: unknown;
  };

  if (!res.ok) {
    return {
      kind: "error",
      message: messageFromPayload(data, "Sign-in failed. Check your credentials."),
    };
  }

  if (typeof data.setup_url === "string" && data.setup_url) {
    return { kind: "mfa_setup", setupUrl: data.setup_url };
  }

  if (typeof data.redirect_url === "string" && data.redirect_url) {
    return { kind: "redirect", url: data.redirect_url };
  }

  if (typeof data.access_token === "string" && data.access_token) {
    localStorage.setItem("access_token", data.access_token);
    if (typeof data.refresh_token === "string" && data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
  }

  const user =
    data.user && typeof data.user === "object"
      ? portalUserFromPayload(data.user)
      : await checkSession();

  if (!user) {
    return {
      kind: "error",
      message: "Signed in, but session details were unavailable. Refresh and try again.",
    };
  }

  return { kind: "authenticated", user };
}

export async function logoutSession(): Promise<void> {
  if (authMode === "mock") {
    writeMockSession(null);
    return;
  }

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
  }
}

export async function requestPasswordReset(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: "Email is required." };
  }

  if (authMode === "mock") {
    return { ok: true };
  }

  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: trimmed }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      message: messageFromPayload(data, "Could not start password reset."),
    };
  }

  return { ok: true };
}
