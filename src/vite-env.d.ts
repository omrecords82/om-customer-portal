/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_PORTAL_BASE_PATH?: string;
  /** `mock` (default) | `live` — live uses OM `/api/auth/*`. */
  readonly VITE_PORTAL_AUTH_MODE?: string;
  /** When `true`, shell routes require a session. Default false for /portal2 preview. */
  readonly VITE_PORTAL_REQUIRE_AUTH?: string;
  /** Cemetery feature flags — all default false (per-church enablement). */
  readonly VITE_CEMETERY_ENABLED?: string;
  readonly VITE_CEMETERY_MAP_ENABLED?: string;
  readonly VITE_CEMETERY_MAINTENANCE_ENABLED?: string;
  readonly VITE_CEMETERY_REPORTS_ENABLED?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};

declare module "@om/tokens/css";
declare module "@om/ui/css";
