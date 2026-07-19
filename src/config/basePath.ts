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

export const portalBasePath = normalizePortalBasePath(
  import.meta.env.VITE_PORTAL_BASE_PATH || "/portal2",
);
