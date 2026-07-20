import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import { extractApiMessage } from "../settings/settingsApi";

export type RecordFieldTypeKey = "baptism" | "marriage" | "funeral" | "chrismation";

export type RecordFieldRow = {
  readonly key: string;
  readonly label: string;
  readonly headerLabel: string;
  readonly required: boolean;
  readonly visible: boolean;
  readonly sortOrder: number;
  readonly type?: string;
  readonly aliases?: readonly string[];
  /** Presentation-only — never renames physical DB columns. */
  readonly protected?: boolean;
};

export type RecordFieldConfig = Partial<Record<RecordFieldTypeKey, RecordFieldRow[]>>;

export type RecordFieldTableRow = {
  readonly id: string;
  readonly field: RecordFieldRow;
};

/** Identity / audit columns that must stay visible in admin UI but cannot be hidden from storage. */
export const PROTECTED_FIELD_KEYS = new Set([
  "id",
  "church_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "verified_by",
  "verified_at",
  "source_scan_id",
  "ocr_confidence",
]);

export const RECORD_FIELD_TYPE_OPTIONS: { value: RecordFieldTypeKey; label: string; live: boolean }[] = [
  { value: "baptism", label: "Baptism", live: true },
  { value: "marriage", label: "Marriage", live: true },
  { value: "funeral", label: "Funeral", live: true },
  { value: "chrismation", label: "Chrismation", live: false },
];

type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly message: string; readonly status: number };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseFieldRow(row: Record<string, unknown>): RecordFieldRow {
  const key = asString(row.key);
  const label = asString(row.label, key);
  return {
    key,
    label,
    headerLabel: asString(row.headerLabel, label),
    required: row.required === true,
    visible: row.visible !== false,
    sortOrder: Number(row.sortOrder ?? 0),
    protected: PROTECTED_FIELD_KEYS.has(key),
    ...(row.type != null ? { type: asString(row.type) } : {}),
    ...(Array.isArray(row.aliases) ? { aliases: row.aliases.map(String) } : {}),
  };
}

export function parseRecordFieldsResponse(payload: unknown): RecordFieldConfig {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  const fields = root.fields;
  if (!fields || typeof fields !== "object") return {};
  const out: RecordFieldConfig = {};
  for (const [recordType, rows] of Object.entries(fields as Record<string, unknown>)) {
    if (!Array.isArray(rows)) continue;
    const parsed = rows
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .map(parseFieldRow)
      .filter((r) => r.key.length > 0);
    out[recordType as RecordFieldTypeKey] = parsed;
  }
  return out;
}

export function buildRecordFieldSavePayload(
  config: RecordFieldConfig,
): Record<string, RecordFieldRow[]> {
  const out: Record<string, RecordFieldRow[]> = {};
  for (const [recordType, rows] of Object.entries(config)) {
    if (!rows.length) continue;
    out[recordType] = rows.map((row, idx) => ({
      ...row,
      sortOrder: idx,
    }));
  }
  return out;
}

export function reorderFieldRows(
  rows: RecordFieldRow[],
  fromIndex: number,
  direction: -1 | 1,
): RecordFieldRow[] {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= rows.length) return rows;
  const next = [...rows];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return rows;
  next.splice(toIndex, 0, item);
  return next.map((row, idx) => ({ ...row, sortOrder: idx }));
}

export function resetRecordTypeToDefaults(
  config: RecordFieldConfig,
  recordType: RecordFieldTypeKey,
  defaults: RecordFieldConfig,
): RecordFieldConfig {
  const defaultRows = defaults[recordType];
  return {
    ...config,
    [recordType]: defaultRows ? [...defaultRows] : [],
  };
}

export async function fetchRecordFieldConfig(
  churchId: number,
): Promise<ApiResult<{ readonly fields: RecordFieldConfig; readonly defaults: RecordFieldConfig }>> {
  if (!Number.isFinite(churchId) || churchId <= 0) {
    return { ok: false, message: "No church context.", status: 400 };
  }
  if (authMode !== "live") {
    return {
      ok: true,
      data: { fields: {}, defaults: {} },
    };
  }
  try {
    const res = await apiFetch(`/api/church/${String(churchId)}/ocr/record-fields`, {
      method: "GET",
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Record fields unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    const root = payload as Record<string, unknown>;
    return {
      ok: true,
      data: {
        fields: parseRecordFieldsResponse(payload),
        defaults: parseRecordFieldsResponse({ fields: root.defaults }),
      },
    };
  } catch {
    return { ok: false, message: "Network error loading record field mapping.", status: 0 };
  }
}

export async function saveRecordFieldConfig(
  churchId: number,
  config: RecordFieldConfig,
): Promise<ApiResult<RecordFieldConfig>> {
  if (!Number.isFinite(churchId) || churchId <= 0) {
    return { ok: false, message: "No church context.", status: 400 };
  }
  if (authMode !== "live") {
    return { ok: true, data: config };
  }
  try {
    const res = await apiFetch(`/api/church/${String(churchId)}/ocr/record-fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordFieldConfig: buildRecordFieldSavePayload(config) }),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not save record fields (${String(res.status)}).`),
        status: res.status,
      };
    }
    return { ok: true, data: parseRecordFieldsResponse(payload) };
  } catch {
    return { ok: false, message: "Network error saving record field mapping.", status: 0 };
  }
}
