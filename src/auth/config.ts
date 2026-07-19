function readBoolEnv(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

export type AuthMode = "mock" | "live";

function readAuthMode(value: unknown): AuthMode {
  if (typeof value === "string" && value.trim().toLowerCase() === "live") {
    return "live";
  }
  return "mock";
}

/** `mock` (default) for /portal2 pilots; `live` hits OM `/api/auth/*`. */
export const authMode: AuthMode = readAuthMode(import.meta.env.VITE_PORTAL_AUTH_MODE);

/**
 * When true, unauthenticated users are redirected to `/auth/login`.
 * Default false — preview shell stays usable without a real session.
 */
export const requireAuth = readBoolEnv(
  import.meta.env.VITE_PORTAL_REQUIRE_AUTH,
  false,
);
