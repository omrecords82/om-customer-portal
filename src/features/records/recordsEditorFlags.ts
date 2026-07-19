/**
 * Records editor dual-run feature flags — defaults OFF (operator 2026-07-19).
 * Per-type enablement for Baptism → Marriage → Funeral pilot order.
 * Editors remain blocked until flags + readiness gates pass; no editor UI here.
 */

import type { AuthMode } from "../../auth/config";

export type RecordsEditorType = "baptism" | "marriage" | "funeral";

export type RecordsEditorFlags = {
  readonly baptismEnabled: boolean;
  readonly marriageEnabled: boolean;
  readonly funeralEnabled: boolean;
};

export const DEFAULT_RECORDS_EDITOR_FLAGS: RecordsEditorFlags = {
  baptismEnabled: false,
  marriageEnabled: false,
  funeralEnabled: false,
};

/** Env keys for operator deploy overlays (all default false). */
export const RECORDS_EDITOR_ENV_KEYS = {
  baptism: "VITE_PORTAL_RECORDS_EDITOR_BAPTISM",
  marriage: "VITE_PORTAL_RECORDS_EDITOR_MARRIAGE",
  funeral: "VITE_PORTAL_RECORDS_EDITOR_FUNERAL",
} as const;

const EDITOR_TYPE_ORDER: readonly RecordsEditorType[] = [
  "baptism",
  "marriage",
  "funeral",
];

const RECORDS_EDITOR_TYPE_LABEL: Record<RecordsEditorType, string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  funeral: "Funeral",
};

/** OM role hierarchy — deacon and above may manage sacramental records (Wave H §1). */
const MANAGE_RECORDS_ROLES = new Set([
  "super_admin",
  "admin",
  "church_admin",
  "priest",
  "deacon",
]);

function readBool(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const n = value.trim().toLowerCase();
  if (n === "1" || n === "true" || n === "yes") return true;
  if (n === "0" || n === "false" || n === "no") return false;
  return fallback;
}

function flagForType(
  flags: RecordsEditorFlags,
  type: RecordsEditorType,
): boolean {
  switch (type) {
    case "baptism":
      return flags.baptismEnabled;
    case "marriage":
      return flags.marriageEnabled;
    case "funeral":
      return flags.funeralEnabled;
  }
}

/**
 * Resolve flags from env overlays + optional church override payload.
 * Church overrides win when provided (future OM church feature seam).
 */
export function resolveRecordsEditorFlags(opts?: {
  readonly envOverrides?: Partial<RecordsEditorFlags> | null;
  readonly churchOverrides?: Partial<RecordsEditorFlags> | null;
}): RecordsEditorFlags {
  const fromEnv: RecordsEditorFlags = {
    baptismEnabled: readBool(
      import.meta.env.VITE_PORTAL_RECORDS_EDITOR_BAPTISM,
      false,
    ),
    marriageEnabled: readBool(
      import.meta.env.VITE_PORTAL_RECORDS_EDITOR_MARRIAGE,
      false,
    ),
    funeralEnabled: readBool(
      import.meta.env.VITE_PORTAL_RECORDS_EDITOR_FUNERAL,
      false,
    ),
  };

  const env = opts?.envOverrides;
  const withEnv: RecordsEditorFlags = env
    ? {
        baptismEnabled: env.baptismEnabled ?? fromEnv.baptismEnabled,
        marriageEnabled: env.marriageEnabled ?? fromEnv.marriageEnabled,
        funeralEnabled: env.funeralEnabled ?? fromEnv.funeralEnabled,
      }
    : fromEnv;

  const o = opts?.churchOverrides;
  if (!o) return withEnv;

  return {
    baptismEnabled: o.baptismEnabled ?? withEnv.baptismEnabled,
    marriageEnabled: o.marriageEnabled ?? withEnv.marriageEnabled,
    funeralEnabled: o.funeralEnabled ?? withEnv.funeralEnabled,
  };
}

export function isRecordsEditorFlagEnabled(
  flags: RecordsEditorFlags,
  type: RecordsEditorType,
): boolean {
  return flagForType(flags, type);
}

/** Pilot policy: enable at most one editor type during dual-run (Baptism first). */
export function countEnabledRecordsEditors(flags: RecordsEditorFlags): number {
  return EDITOR_TYPE_ORDER.filter((t) => flagForType(flags, t)).length;
}

export function listEnabledRecordsEditorTypes(
  flags: RecordsEditorFlags,
): readonly RecordsEditorType[] {
  return EDITOR_TYPE_ORDER.filter((t) => flagForType(flags, t));
}

export function hasDualRunPilotConflict(flags: RecordsEditorFlags): boolean {
  return countEnabledRecordsEditors(flags) > 1;
}

/** Type flag on and pilot conflict absent — prerequisite for editor chrome/routes. */
export function canShowRecordsEditor(
  flags: RecordsEditorFlags,
  type: RecordsEditorType,
): boolean {
  return isRecordsEditorFlagEnabled(flags, type) && !hasDualRunPilotConflict(flags);
}

export function canManageRecords(role: string | undefined): boolean {
  if (!role) return false;
  return MANAGE_RECORDS_ROLES.has(role.trim().toLowerCase());
}

export type RecordsEditorReadinessInput = {
  readonly flags: RecordsEditorFlags;
  readonly type: RecordsEditorType;
  readonly authMode?: AuthMode;
  readonly churchId?: number | null;
  readonly role?: string | null;
};

/** Full gate before editor affordances or routes activate (UI may still be unshipped). */
export function isRecordsEditorReady(input: RecordsEditorReadinessInput): boolean {
  if (!canShowRecordsEditor(input.flags, input.type)) return false;
  const mode = input.authMode ?? "mock";
  if (mode !== "live") return false;
  const churchId = input.churchId;
  if (churchId == null || churchId <= 0) return false;
  if (!canManageRecords(input.role ?? undefined)) return false;
  return true;
}

/** Future portal editor routes — disabled until Wave H ships editor hosts. */
export function buildRecordsEditorRoute(
  type: RecordsEditorType,
  opts?: { readonly recordId?: string | number | null; readonly action?: "new" | "edit" },
): string {
  const action = opts?.action ?? (opts?.recordId != null ? "edit" : "new");
  if (action === "new") return `/records/${type}/new`;
  const id = opts?.recordId;
  if (id == null || id === "") return `/records/${type}/new`;
  return `/records/${type}/${String(id)}/edit`;
}

/** Legacy SPA fallback while dual-run is off or editor UI is unshipped. */
export function buildLegacyRecordsEditorUrl(type: RecordsEditorType): string {
  return `/portal/records?type=${type}`;
}

export function canNavigateToRecordsEditor(
  input: RecordsEditorReadinessInput & { readonly editorsUiShipped?: boolean },
): boolean {
  if (input.editorsUiShipped !== true) return false;
  return isRecordsEditorReady(input);
}

export function describeRecordsEditorGateStatus(
  flags: RecordsEditorFlags,
  opts?: { readonly editorsUiShipped?: boolean },
): string {
  const enabled = listEnabledRecordsEditorTypes(flags);

  if (enabled.length === 0) {
    return "Sacramental editors are dual-run gated (per-type env flags default off). Legacy /portal editors remain source of truth until Wave H ships.";
  }

  if (hasDualRunPilotConflict(flags)) {
    return `Multiple editor flags enabled (${enabled.map((t) => RECORDS_EDITOR_TYPE_LABEL[t]).join(", ")}) — pilot policy allows one type at a time (Baptism first).`;
  }

  const [type] = enabled;
  if (!type) {
    return "Sacramental editors are dual-run gated (per-type env flags default off). Legacy /portal editors remain source of truth until Wave H ships.";
  }
  const label = RECORDS_EDITOR_TYPE_LABEL[type];

  if (opts?.editorsUiShipped !== true) {
    return `${label} editor flag is on; editor UI not shipped yet — list-only until Wave H implementation. Legacy fallback: ${buildLegacyRecordsEditorUrl(type)}.`;
  }

  return `${label} editor dual-run active when live auth, church context, and deacon+ role gates pass.`;
}
