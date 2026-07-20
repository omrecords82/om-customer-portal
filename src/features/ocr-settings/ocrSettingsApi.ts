import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import { extractApiMessage } from "../settings/settingsApi";

export type OcrRuleSeverity = "suggestion" | "warning" | "blocker";

export type OcrParishRule = {
  readonly id: number;
  readonly church_id: number | null;
  readonly scope: string;
  readonly name: string;
  readonly description: string | null;
  readonly record_type: string;
  readonly severity: OcrRuleSeverity;
  readonly priority: number;
  readonly is_active: boolean | number;
  readonly conditions_json?: unknown;
  readonly actions_json?: unknown;
};

export type OcrConfigEntity = {
  readonly id: number;
  readonly entity_type: string;
  readonly canonical_value: string;
  readonly display_label?: string | null;
  readonly role?: string | null;
  readonly active_from?: string | null;
  readonly active_to?: string | null;
  readonly variants_json?: unknown;
  readonly metadata_json?: unknown;
  readonly source_notes?: string | null;
  readonly is_active?: boolean | number;
};

export type RuleTableRow = {
  readonly id: string;
  readonly rule: OcrParishRule;
};

export type EntityTableRow = {
  readonly id: string;
  readonly entity: OcrConfigEntity;
};

export type DocumentProcessingSettings = {
  readonly spellingCorrection: "exact" | "fix";
  readonly extractAllText: "yes" | "no";
  readonly improveFormatting: "yes" | "no";
  readonly recordLayoutMode: "auto" | "single" | "ledger" | "multi_record_split" | "multi_form_page";
  readonly extractionAgentMode:
    | "agent2_fallback_agent1"
    | "agent2_only"
    | "agent1_only"
    | "agent1_fallback_agent2";
};

export type DocumentDeletionSettings = {
  readonly deleteAfter: number;
  readonly deleteUnit: "minutes" | "hours" | "days";
};

export type OcrChurchSettings = {
  readonly useRecordSnippets: boolean;
  readonly documentProcessing: DocumentProcessingSettings;
  readonly documentDeletion: DocumentDeletionSettings;
};

export type ClergyDiscoveryGroup = {
  readonly identity_key?: string;
  readonly suggested_canonical?: string;
  readonly canonical_value?: string;
  readonly variants?: { value: string; count: number }[];
  readonly suggested_active_from?: string | null;
  readonly suggested_active_to?: string | null;
  readonly role?: string;
  readonly entity_id?: number;
};

export type LocationDiscoveryGroup = {
  readonly identity_key?: string;
  readonly suggested_canonical?: string;
  readonly canonical_value?: string;
  readonly location_type?: string;
  readonly variants?: { value: string; count: number }[];
  readonly entity_id?: number;
};

type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly message: string; readonly status: number };

function churchPath(churchId: number, suffix: string): string {
  return `/api/church/${String(churchId)}/ocr${suffix}`;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseRuleRow(row: Record<string, unknown>): OcrParishRule {
  return {
    id: Number(row.id),
    church_id: row.church_id == null ? null : Number(row.church_id),
    scope: asString(row.scope, "church"),
    name: asString(row.name),
    description: row.description == null ? null : asString(row.description),
    record_type: asString(row.record_type, "all"),
    severity: asString(row.severity, "suggestion") as OcrRuleSeverity,
    priority: Number(row.priority ?? 100),
    is_active: asBool(row.is_active),
    conditions_json: row.conditions_json,
    actions_json: row.actions_json,
  };
}

function parseEntityRow(row: Record<string, unknown>): OcrConfigEntity {
  const base: OcrConfigEntity = {
    id: Number(row.id),
    entity_type: asString(row.entity_type),
    canonical_value: asString(row.canonical_value),
    display_label: row.display_label == null ? null : asString(row.display_label),
    role: row.role == null ? null : asString(row.role),
    active_from: row.active_from == null ? null : asString(row.active_from),
    active_to: row.active_to == null ? null : asString(row.active_to),
    variants_json: row.variants_json,
    metadata_json: row.metadata_json,
    source_notes: row.source_notes == null ? null : asString(row.source_notes),
  };
  if (row.is_active !== undefined) {
    return { ...base, is_active: asBool(row.is_active) };
  }
  return base;
}

export function defaultOcrChurchSettings(): OcrChurchSettings {
  return {
    useRecordSnippets: true,
    documentProcessing: {
      spellingCorrection: "fix",
      extractAllText: "yes",
      improveFormatting: "yes",
      recordLayoutMode: "auto",
      extractionAgentMode: "agent2_fallback_agent1",
    },
    documentDeletion: {
      deleteAfter: 7,
      deleteUnit: "days",
    },
  };
}

export function parseOcrChurchSettings(payload: unknown): OcrChurchSettings {
  const defaults = defaultOcrChurchSettings();
  if (!payload || typeof payload !== "object") return defaults;
  const root = payload as Record<string, unknown>;
  const dp = root.documentProcessing;
  const dd = root.documentDeletion;
  const documentProcessing: DocumentProcessingSettings =
    dp && typeof dp === "object"
      ? {
          spellingCorrection:
            (dp as Record<string, unknown>).spellingCorrection === "exact" ? "exact" : "fix",
          extractAllText:
            (dp as Record<string, unknown>).extractAllText === "no" ? "no" : "yes",
          improveFormatting:
            (dp as Record<string, unknown>).improveFormatting === "no" ? "no" : "yes",
          recordLayoutMode: asString(
            (dp as Record<string, unknown>).recordLayoutMode,
            "auto",
          ) as DocumentProcessingSettings["recordLayoutMode"],
          extractionAgentMode: asString(
            (dp as Record<string, unknown>).extractionAgentMode,
            "agent2_fallback_agent1",
          ) as DocumentProcessingSettings["extractionAgentMode"],
        }
      : defaults.documentProcessing;
  const documentDeletion =
    dd && typeof dd === "object"
      ? {
          deleteAfter: Number((dd as Record<string, unknown>).deleteAfter ?? 7),
          deleteUnit: asString(
            (dd as Record<string, unknown>).deleteUnit,
            "days",
          ) as DocumentDeletionSettings["deleteUnit"],
        }
      : defaults.documentDeletion;

  return {
    useRecordSnippets:
      root.useRecordSnippets === undefined ? defaults.useRecordSnippets : asBool(root.useRecordSnippets),
    documentProcessing,
    documentDeletion,
  };
}

export function isSystemRule(rule: OcrParishRule): boolean {
  return rule.church_id == null || rule.scope === "global";
}

export function parseClergyVariants(raw: unknown): { value: string; count: number }[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return parseClergyVariants(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      value: asString(v.value, asString(v.variant)),
      count: Number(v.count ?? v.record_count ?? 0),
    }))
    .filter((v) => v.value.length > 0);
}

export function parseLocationMetadata(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return parseLocationMetadata(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "string") out[key] = val;
  }
  return out;
}

async function ocrRequest<T>(
  churchId: number,
  path: string,
  init: RequestInit,
  parse: (payload: unknown) => T,
  fallback: string,
): Promise<ApiResult<T>> {
  if (!Number.isFinite(churchId) || churchId <= 0) {
    return { ok: false, message: "No church context.", status: 400 };
  }
  if (authMode !== "live") {
    return { ok: false, message: "OCR settings require live auth mode.", status: 400 };
  }
  try {
    const res = await apiFetch(churchPath(churchId, path), init);
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `${fallback} (${String(res.status)}).`),
        status: res.status,
      };
    }
    return { ok: true, data: parse(payload) };
  } catch {
    return { ok: false, message: `Network error: ${fallback}.`, status: 0 };
  }
}

export async function fetchOcrChurchSettings(churchId: number): Promise<ApiResult<OcrChurchSettings>> {
  return ocrRequest(churchId, "/settings", { method: "GET" }, parseOcrChurchSettings, "Could not load OCR settings");
}

export async function saveOcrChurchSettings(
  churchId: number,
  settings: Partial<OcrChurchSettings>,
): Promise<ApiResult<OcrChurchSettings>> {
  return ocrRequest(
    churchId,
    "/settings",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    },
    parseOcrChurchSettings,
    "Could not save OCR settings",
  );
}

export async function fetchOcrRules(churchId: number): Promise<ApiResult<OcrParishRule[]>> {
  return ocrRequest(
    churchId,
    "/rules",
    { method: "GET" },
    (payload) => {
      if (!payload || typeof payload !== "object") return [];
      const rules = (payload as Record<string, unknown>).rules;
      if (!Array.isArray(rules)) return [];
      return rules
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(parseRuleRow);
    },
    "Could not load OCR rules",
  );
}

export async function createOcrRule(
  churchId: number,
  body: {
    readonly name: string;
    readonly description?: string;
    readonly record_type: string;
    readonly severity: OcrRuleSeverity;
    readonly priority?: number;
    readonly conditions_json: unknown;
    readonly actions_json: unknown;
  },
): Promise<ApiResult<{ readonly id: number }>> {
  return ocrRequest(
    churchId,
    "/rules",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, scope: "church" }),
    },
    (payload) => {
      if (!payload || typeof payload !== "object") return { id: 0 };
      return { id: Number((payload as Record<string, unknown>).id) };
    },
    "Could not create rule",
  );
}

export async function patchOcrRule(
  churchId: number,
  ruleId: number,
  body: Record<string, unknown>,
): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    `/rules/${String(ruleId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    () => undefined,
    "Could not update rule",
  );
}

export async function deleteOcrRule(churchId: number, ruleId: number): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    `/rules/${String(ruleId)}`,
    { method: "DELETE" },
    () => undefined,
    "Could not delete rule",
  );
}

export async function fetchOcrConfigEntities(churchId: number): Promise<ApiResult<OcrConfigEntity[]>> {
  await ocrRequest(
    churchId,
    "/rules/config/locations/ensure-defaults",
    { method: "POST" },
    () => undefined,
    "ensure defaults",
  ).catch(() => null);

  return ocrRequest(
    churchId,
    "/rules/config/entities",
    { method: "GET" },
    (payload) => {
      if (!payload || typeof payload !== "object") return [];
      const entities = (payload as Record<string, unknown>).entities;
      if (!Array.isArray(entities)) return [];
      return entities
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(parseEntityRow);
    },
    "Could not load parish configuration entities",
  );
}

export async function createOcrConfigEntity(
  churchId: number,
  body: Record<string, unknown>,
): Promise<ApiResult<{ readonly id: number }>> {
  return ocrRequest(
    churchId,
    "/rules/config/entities",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    (payload) => {
      if (!payload || typeof payload !== "object") return { id: 0 };
      return { id: Number((payload as Record<string, unknown>).id) };
    },
    "Could not create entity",
  );
}

export async function patchOcrConfigEntity(
  churchId: number,
  entityId: number,
  body: Record<string, unknown>,
): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    `/rules/config/entities/${String(entityId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    () => undefined,
    "Could not update entity",
  );
}

export async function deleteOcrConfigEntity(
  churchId: number,
  entityId: number,
): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    `/rules/config/entities/${String(entityId)}`,
    { method: "DELETE" },
    () => undefined,
    "Could not delete entity",
  );
}

export async function discoverClergy(churchId: number): Promise<ApiResult<ClergyDiscoveryGroup[]>> {
  return ocrRequest(
    churchId,
    "/rules/config/clergy/discover",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    (payload) => {
      if (!payload || typeof payload !== "object") return [];
      const groups = (payload as Record<string, unknown>).groups;
      return Array.isArray(groups) ? (groups as ClergyDiscoveryGroup[]) : [];
    },
    "Clergy discovery failed",
  );
}

export async function acceptClergyDiscovery(
  churchId: number,
  groups: ClergyDiscoveryGroup[],
): Promise<ApiResult<{ readonly message: string }>> {
  return ocrRequest(
    churchId,
    "/rules/config/clergy/accept",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    },
    (payload) => ({
      message: extractApiMessage(payload, "Clergy accepted."),
    }),
    "Could not accept clergy discovery",
  );
}

export async function discoverLocations(churchId: number): Promise<ApiResult<LocationDiscoveryGroup[]>> {
  return ocrRequest(
    churchId,
    "/rules/config/locations/discover",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    (payload) => {
      if (!payload || typeof payload !== "object") return [];
      const groups = (payload as Record<string, unknown>).groups;
      return Array.isArray(groups) ? (groups as LocationDiscoveryGroup[]) : [];
    },
    "Location discovery failed",
  );
}

export async function acceptLocationDiscovery(
  churchId: number,
  groups: LocationDiscoveryGroup[],
): Promise<ApiResult<{ readonly message: string }>> {
  return ocrRequest(
    churchId,
    "/rules/config/locations/accept",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groups }) },
    (payload) => ({
      message: extractApiMessage(payload, "Locations accepted."),
    }),
    "Could not accept location discovery",
  );
}

export async function mergeClergyEntities(
  churchId: number,
  entityIds: number[],
  canonicalValue: string,
): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    "/rules/config/clergy/merge",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_ids: entityIds, canonical_value: canonicalValue }),
    },
    () => undefined,
    "Could not merge clergy",
  );
}

export async function mergeLocationEntities(
  churchId: number,
  entityIds: number[],
  canonicalValue: string,
): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    "/rules/config/locations/merge",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_ids: entityIds, canonical_value: canonicalValue }),
    },
    () => undefined,
    "Could not merge locations",
  );
}

export async function syncChurchLocationFromParish(churchId: number): Promise<ApiResult<void>> {
  return ocrRequest(
    churchId,
    "/rules/config/locations/ensure-defaults",
    { method: "POST" },
    () => undefined,
    "Could not sync church location",
  );
}
