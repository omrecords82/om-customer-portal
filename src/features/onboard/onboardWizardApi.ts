import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import { extractApiMessage } from "../settings/settingsApi";
import {
  defaultPreviewWizardState,
  readPreviewWizardState,
  writePreviewWizardState,
  type PreviewWizardState,
} from "./onboardWizardData";
import { parseOnboardingMe, type OnboardingMeSlice } from "./onboardApi";

/**
 * Wave I first-login wizard client.
 * Parity: legacy `/onboarding/change-password`, `/onboarding/record-tables`, `/onboarding/record-layouts`
 *   - POST /api/onboarding/change-password
 *   - GET/PUT /api/onboarding/record-tables + POST .../complete
 *   - GET/PUT /api/onboarding/record-layouts + POST .../complete
 */

export type WizardStepId = "password" | "record-tables" | "record-layouts";

export const WIZARD_STEP_LABELS = ["Set password", "Record tables", "Record layouts"] as const;

export type RecordColumnDef = {
  readonly column_key: string;
  readonly display_label: string;
  readonly required?: boolean;
  readonly visible?: boolean;
  readonly editable?: boolean;
  readonly source?: string;
  readonly sort_order?: number;
};

export type RecordTableDef = {
  readonly record_type: string;
  readonly table_key: string;
  readonly display_name: string;
  readonly columns: RecordColumnDef[];
  readonly enabled: boolean;
};

export type CatalogLayout = {
  readonly id: string;
  readonly record_type: string;
  readonly title: string;
  readonly description: string;
  readonly extraction_mode: string;
  readonly era_hint?: string;
  readonly thumbnail: string;
};

export type LayoutSelections = Record<string, readonly string[]>;

export type RecordTablesPayload = {
  readonly onboardingRequestId: string;
  readonly tables: RecordTableDef[];
  readonly tableConfigurationCompleted: boolean;
  readonly layoutConfigurationCompleted: boolean;
  readonly mustChangePassword: boolean;
};

export type RecordLayoutsPayload = {
  readonly onboardingRequestId: string;
  readonly selectedRecordTypes: readonly string[];
  readonly catalogByType: Record<string, CatalogLayout[]>;
  readonly selections: LayoutSelections;
  readonly tableConfigurationCompleted: boolean;
  readonly layoutConfigurationCompleted: boolean;
  readonly mustChangePassword: boolean;
};

export type ApiResult<T> =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly data: T }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type MutationResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly redirectTo: string }
  | { readonly ok: false; readonly message: string; readonly status: number };

export const RECORD_TYPE_LABELS: Record<string, string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  funeral: "Funeral",
  chrismation: "Chrismation",
  custom: "Custom",
  other: "Other",
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

/** Map legacy OM redirect paths to portal routes. */
export function mapLegacyOnboardingRedirect(path: string | null | undefined): string {
  if (!path) return "/";
  if (path === "/portal" || path === "/portal2" || path === "/") return "/";
  if (path.startsWith("/onboarding/")) return path;
  return "/";
}

/** Resolve the next first-login wizard route from `/api/onboarding/me` slice. */
export function resolveFirstLoginWizardPath(me: OnboardingMeSlice | null): string | null {
  if (!me?.onboardingRequestId) return null;
  if (me.mustChangePassword) return "/onboarding/change-password";
  if (!me.tableConfigurationCompleted) return "/onboarding/record-tables";
  if (!me.layoutConfigurationCompleted) return "/onboarding/record-layouts";
  return null;
}

export function wizardStepIndex(step: WizardStepId): number {
  switch (step) {
    case "password":
      return 0;
    case "record-tables":
      return 1;
    case "record-layouts":
      return 2;
  }
}

export function allRecordTypesHaveLayoutSelection(
  recordTypes: readonly string[],
  selections: LayoutSelections,
): boolean {
  return recordTypes.every((rt) => (selections[rt] ?? []).length > 0);
}

function previewMeFromState(state: PreviewWizardState): OnboardingMeSlice {
  return {
    onboardingRequestId: state.onboardingRequestId,
    status: state.layoutConfigurationCompleted
      ? "active"
      : state.tableConfigurationCompleted
        ? "record_tables_review"
        : "awaiting_first_login",
    mustChangePassword: state.mustChangePassword,
    tableConfigurationCompleted: state.tableConfigurationCompleted,
    layoutConfigurationCompleted: state.layoutConfigurationCompleted,
    firstLoginCompleted: !state.mustChangePassword,
  };
}

function parseRecordTablesPayload(payload: unknown): RecordTablesPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.success === false) return null;
  const tablesRaw = root.tables;
  const tables = Array.isArray(tablesRaw)
    ? tablesRaw
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((table) => ({
          record_type: asString(table.record_type),
          table_key: asString(table.table_key),
          display_name: asString(table.display_name),
          enabled: table.enabled !== false,
          columns: Array.isArray(table.columns)
            ? table.columns
                .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
                .map((col) => {
                  const source = asString(col.source);
                  return {
                    column_key: asString(col.column_key),
                    display_label: asString(col.display_label),
                    required: asBool(col.required),
                    visible: col.visible !== false,
                    editable: col.editable !== false,
                    ...(source ? { source } : {}),
                    ...(typeof col.sort_order === "number" ? { sort_order: col.sort_order } : {}),
                  };
                })
            : [],
        }))
        .filter((table) => table.record_type.length > 0)
    : [];
  return {
    onboardingRequestId: asString(root.onboarding_request_id),
    tables,
    tableConfigurationCompleted: asBool(root.table_configuration_completed),
    layoutConfigurationCompleted: asBool(root.layout_configuration_completed),
    mustChangePassword: asBool(root.must_change_password),
  };
}

function parseCatalogLayout(raw: Record<string, unknown>): CatalogLayout | null {
  const id = asString(raw.id);
  if (!id) return null;
  const eraHint = asString(raw.era_hint);
  return {
    id,
    record_type: asString(raw.record_type),
    title: asString(raw.title),
    description: asString(raw.description),
    extraction_mode: asString(raw.extraction_mode, "structured_table"),
    ...(eraHint ? { era_hint: eraHint } : {}),
    thumbnail: asString(raw.thumbnail),
  };
}

function parseRecordLayoutsPayload(payload: unknown): RecordLayoutsPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.success === false) return null;

  const selectedRecordTypes = Array.isArray(root.selected_record_types)
    ? root.selected_record_types.filter((v): v is string => typeof v === "string")
    : [];

  const catalogByType: Record<string, CatalogLayout[]> = {};
  const catalogRaw = root.catalog_by_type;
  if (catalogRaw && typeof catalogRaw === "object") {
    for (const [key, value] of Object.entries(catalogRaw as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      catalogByType[key] = value
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map(parseCatalogLayout)
        .filter((item): item is CatalogLayout => item != null);
    }
  }

  const selectionsRaw = root.selections;
  const selections: LayoutSelections = {};
  if (selectionsRaw && typeof selectionsRaw === "object") {
    for (const [key, value] of Object.entries(selectionsRaw as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        selections[key] = value.filter((v): v is string => typeof v === "string");
      }
    }
  }

  return {
    onboardingRequestId: asString(root.onboarding_request_id),
    selectedRecordTypes,
    catalogByType,
    selections,
    tableConfigurationCompleted: asBool(root.table_configuration_completed),
    layoutConfigurationCompleted: asBool(root.layout_configuration_completed),
    mustChangePassword: asBool(root.must_change_password),
  };
}

export async function fetchOnboardingMeSlice(): Promise<
  ApiResult<OnboardingMeSlice | null>
> {
  if (authMode !== "live") {
    return { ok: true, source: "preview", data: previewMeFromState(readPreviewWizardState()) };
  }

  try {
    const res = await apiFetch("/api/onboarding/me", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Onboarding status unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    return { ok: true, source: "live", data: parseOnboardingMe(payload) };
  } catch {
    return { ok: false, message: "Network error loading onboarding status.", status: 0 };
  }
}

export async function changeOnboardingPassword(body: {
  readonly currentPassword: string;
  readonly newPassword: string;
}): Promise<MutationResult> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    writePreviewWizardState({ ...state, mustChangePassword: false });
    return {
      ok: true,
      source: "preview",
      redirectTo: "/onboarding/record-tables",
    };
  }

  try {
    const res = await apiFetch("/api/onboarding/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Password change failed (${String(res.status)}).`),
        status: res.status,
      };
    }
    const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    return {
      ok: true,
      source: "live",
      redirectTo: mapLegacyOnboardingRedirect(asString(root.redirectTo, "/onboarding/record-tables")),
    };
  } catch {
    return { ok: false, message: "Network error changing password.", status: 0 };
  }
}

export async function fetchRecordTables(): Promise<ApiResult<RecordTablesPayload>> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    return {
      ok: true,
      source: "preview",
      data: {
        onboardingRequestId: state.onboardingRequestId,
        tables: state.tables,
        tableConfigurationCompleted: state.tableConfigurationCompleted,
        layoutConfigurationCompleted: state.layoutConfigurationCompleted,
        mustChangePassword: state.mustChangePassword,
      },
    };
  }

  try {
    const res = await apiFetch("/api/onboarding/record-tables", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Record tables unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    const parsed = parseRecordTablesPayload(payload);
    if (!parsed) {
      return { ok: false, message: "Unexpected record tables response.", status: res.status };
    }
    return { ok: true, source: "live", data: parsed };
  } catch {
    return { ok: false, message: "Network error loading record tables.", status: 0 };
  }
}

export async function saveRecordTablesDraft(
  tables: readonly RecordTableDef[],
): Promise<ApiResult<RecordTablesPayload>> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    const next = { ...state, tables: [...tables] };
    writePreviewWizardState(next);
    return {
      ok: true,
      source: "preview",
      data: {
        onboardingRequestId: next.onboardingRequestId,
        tables: next.tables,
        tableConfigurationCompleted: next.tableConfigurationCompleted,
        layoutConfigurationCompleted: next.layoutConfigurationCompleted,
        mustChangePassword: next.mustChangePassword,
      },
    };
  }

  try {
    const res = await apiFetch("/api/onboarding/record-tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, draft: true }),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Save failed (${String(res.status)}).`),
        status: res.status,
      };
    }
    const parsed = parseRecordTablesPayload(payload);
    if (!parsed) {
      return { ok: false, message: "Unexpected save response.", status: res.status };
    }
    return { ok: true, source: "live", data: parsed };
  } catch {
    return { ok: false, message: "Network error saving record tables.", status: 0 };
  }
}

export async function completeRecordTables(
  tables: readonly RecordTableDef[],
): Promise<MutationResult> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    writePreviewWizardState({
      ...state,
      tables: [...tables],
      tableConfigurationCompleted: true,
    });
    return {
      ok: true,
      source: "preview",
      redirectTo: "/onboarding/record-layouts",
    };
  }

  try {
    const putRes = await apiFetch("/api/onboarding/record-tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, draft: false }),
    });
    const putPayload: unknown = await putRes.json().catch(() => null);
    if (!putRes.ok) {
      return {
        ok: false,
        message: extractApiMessage(putPayload, `Save failed (${String(putRes.status)}).`),
        status: putRes.status,
      };
    }

    const res = await apiFetch("/api/onboarding/record-tables/complete", { method: "POST" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not complete setup (${String(res.status)}).`),
        status: res.status,
      };
    }
    const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    return {
      ok: true,
      source: "live",
      redirectTo: mapLegacyOnboardingRedirect(
        asString(root.redirectTo, "/onboarding/record-layouts"),
      ),
    };
  } catch {
    return { ok: false, message: "Network error completing record tables.", status: 0 };
  }
}

export async function fetchRecordLayouts(): Promise<ApiResult<RecordLayoutsPayload>> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    return {
      ok: true,
      source: "preview",
      data: {
        onboardingRequestId: state.onboardingRequestId,
        selectedRecordTypes: state.selectedRecordTypes,
        catalogByType: state.catalogByType,
        selections: state.selections,
        tableConfigurationCompleted: state.tableConfigurationCompleted,
        layoutConfigurationCompleted: state.layoutConfigurationCompleted,
        mustChangePassword: state.mustChangePassword,
      },
    };
  }

  try {
    const res = await apiFetch("/api/onboarding/record-layouts", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Record layouts unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    const parsed = parseRecordLayoutsPayload(payload);
    if (!parsed) {
      return { ok: false, message: "Unexpected record layouts response.", status: res.status };
    }
    return { ok: true, source: "live", data: parsed };
  } catch {
    return { ok: false, message: "Network error loading record layouts.", status: 0 };
  }
}

export async function saveRecordLayoutsDraft(
  selections: LayoutSelections,
): Promise<ApiResult<RecordLayoutsPayload>> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    const next = { ...state, selections };
    writePreviewWizardState(next);
    return {
      ok: true,
      source: "preview",
      data: {
        onboardingRequestId: next.onboardingRequestId,
        selectedRecordTypes: next.selectedRecordTypes,
        catalogByType: next.catalogByType,
        selections: next.selections,
        tableConfigurationCompleted: next.tableConfigurationCompleted,
        layoutConfigurationCompleted: next.layoutConfigurationCompleted,
        mustChangePassword: next.mustChangePassword,
      },
    };
  }

  try {
    const res = await apiFetch("/api/onboarding/record-layouts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, draft: true }),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Save failed (${String(res.status)}).`),
        status: res.status,
      };
    }
    const parsed = parseRecordLayoutsPayload(payload);
    if (!parsed) {
      return { ok: false, message: "Unexpected save response.", status: res.status };
    }
    return { ok: true, source: "live", data: parsed };
  } catch {
    return { ok: false, message: "Network error saving record layouts.", status: 0 };
  }
}

export async function completeRecordLayouts(
  selections: LayoutSelections,
): Promise<MutationResult> {
  if (authMode !== "live") {
    const state = readPreviewWizardState();
    writePreviewWizardState({
      ...state,
      selections,
      layoutConfigurationCompleted: true,
    });
    return { ok: true, source: "preview", redirectTo: "/" };
  }

  try {
    const putRes = await apiFetch("/api/onboarding/record-layouts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, draft: false }),
    });
    const putPayload: unknown = await putRes.json().catch(() => null);
    if (!putRes.ok) {
      return {
        ok: false,
        message: extractApiMessage(putPayload, `Save failed (${String(putRes.status)}).`),
        status: putRes.status,
      };
    }

    const res = await apiFetch("/api/onboarding/record-layouts/complete", { method: "POST" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not complete setup (${String(res.status)}).`),
        status: res.status,
      };
    }
    const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    return {
      ok: true,
      source: "live",
      redirectTo: mapLegacyOnboardingRedirect(asString(root.redirectTo, "/")),
    };
  } catch {
    return { ok: false, message: "Network error completing record layouts.", status: 0 };
  }
}

/** Reset preview wizard for tests and local demos. */
export function resetPreviewWizardState(): void {
  writePreviewWizardState(defaultPreviewWizardState());
}
