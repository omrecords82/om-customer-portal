/**
 * Cemetery feature flags — defaults OFF (operator 2026-07-19).
 * Per-church enablement must not hard-code churches into shared portal code.
 */

export type CemeteryFlags = {
  readonly enabled: boolean;
  readonly mapEnabled: boolean;
  readonly maintenanceEnabled: boolean;
  readonly reportsEnabled: boolean;
};

export const DEFAULT_CEMETERY_FLAGS: CemeteryFlags = {
  enabled: false,
  mapEnabled: false,
  maintenanceEnabled: false,
  reportsEnabled: false,
};

function readBool(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const n = value.trim().toLowerCase();
  if (n === "1" || n === "true" || n === "yes") return true;
  if (n === "0" || n === "false" || n === "no") return false;
  return fallback;
}

/**
 * Resolve flags from env overlays + optional church override payload.
 * Env vars are global pilot defaults; churchOverrides win when provided.
 */
export function resolveCemeteryFlags(opts?: {
  readonly churchOverrides?: Partial<CemeteryFlags> | null;
}): CemeteryFlags {
  const fromEnv: CemeteryFlags = {
    enabled: readBool(import.meta.env.VITE_CEMETERY_ENABLED, false),
    mapEnabled: readBool(import.meta.env.VITE_CEMETERY_MAP_ENABLED, false),
    maintenanceEnabled: readBool(
      import.meta.env.VITE_CEMETERY_MAINTENANCE_ENABLED,
      false,
    ),
    reportsEnabled: readBool(import.meta.env.VITE_CEMETERY_REPORTS_ENABLED, false),
  };

  const o = opts?.churchOverrides;
  if (!o) return fromEnv;

  return {
    enabled: o.enabled ?? fromEnv.enabled,
    mapEnabled: o.mapEnabled ?? fromEnv.mapEnabled,
    maintenanceEnabled: o.maintenanceEnabled ?? fromEnv.maintenanceEnabled,
    reportsEnabled: o.reportsEnabled ?? fromEnv.reportsEnabled,
  };
}

/** Map requires master enable + validated geometry path. */
export function canShowCemeteryMap(flags: CemeteryFlags): boolean {
  return flags.enabled && flags.mapEnabled;
}
