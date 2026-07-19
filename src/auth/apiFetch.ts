import { logoutSession } from "./authApi";
import { authMode, requireAuth } from "./config";
import {
  buildPortalReturnPath,
  loginPathWithNext,
  toAbsolutePortalPath,
} from "./safeNext";

type ApiFetchOptions = RequestInit & {
  readonly skipAuthRedirect?: boolean;
};

/**
 * Fetch helper: credentials + bearer token; on 401 in live+requireAuth, clear session
 * and send the user to login with next= current portal path (incl. nested query/hash).
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
    const next = buildPortalReturnPath({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
    const login = toAbsolutePortalPath(loginPathWithNext(next));
    window.location.assign(login);
  }

  return res;
}
