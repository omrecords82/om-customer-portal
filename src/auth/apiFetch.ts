import { logoutSession } from "./authApi";
import { authMode, requireAuth } from "./config";
import { toAbsolutePortalPath } from "./safeNext";

type ApiFetchOptions = RequestInit & {
  readonly skipAuthRedirect?: boolean;
};

/**
 * Fetch helper: credentials + bearer token; on 401 in live+requireAuth, clear session
 * and send the user to login with next= current portal path.
 */
export async function apiFetch(
  input: string,
  init: ApiFetchOptions = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  const token = localStorage.getItem("access_token");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  if (
    res.status === 401 &&
    !init.skipAuthRedirect &&
    authMode === "live" &&
    requireAuth
  ) {
    await logoutSession();
    const next = `${window.location.pathname}${window.location.search}`;
    const login = toAbsolutePortalPath(
      `/auth/login?next=${encodeURIComponent(next)}`,
    );
    window.location.assign(login);
  }

  return res;
}
