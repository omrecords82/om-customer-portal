import { portalBasePath } from "../config/basePath";

/**
 * Allow only same-app relative paths for post-login `next`.
 * Rejects absolute URLs, protocol-relative URLs, and paths outside the portal basename.
 */
export function getSafePortalNext(
  search: string,
  fallback = "/",
): string {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const raw = params.get("next");
  if (!raw) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return fallback;
  }

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("://")
  ) {
    return fallback;
  }

  const base = portalBasePath === "/" ? "" : portalBasePath;
  if (base && (decoded === base || decoded.startsWith(`${base}/`))) {
    const stripped = decoded.slice(base.length) || "/";
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }

  if (base && decoded.startsWith("/portal/") && !decoded.startsWith("/portal2")) {
    // Do not accidentally land on legacy SPA from Customer Portal login.
    return fallback;
  }

  return decoded.startsWith("/") ? decoded : fallback;
}

/** Absolute path including basename for OIDC `next` query params. */
export function toAbsolutePortalPath(appPath: string): string {
  const normalized = appPath.startsWith("/") ? appPath : `/${appPath}`;
  if (portalBasePath === "/") return normalized;
  if (normalized === "/") return portalBasePath;
  return `${portalBasePath}${normalized}`;
}
