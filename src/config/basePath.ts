export function normalizePortalBasePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;

  return withLeadingSlash.replace(/\/+$/, "");
}

function readPortalBasePathEnv(): string {
  const value = import.meta.env.VITE_PORTAL_BASE_PATH;
  return typeof value === "string" ? value : "/portal";
}

export const portalBasePath = normalizePortalBasePath(readPortalBasePathEnv());
