import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import {
  MOCK_RECORDS,
  type RecordType,
  type SacramentalRecord,
} from "./recordsData";
import type { RecordsTypeFilter } from "./recordsDeepLink";

/**
 * Wave H gate prep — sacramental records list/search client (read-only).
 * Parity: legacy parish records browsers →
 *   GET /api/baptism-records
 *   GET /api/marriage-records
 *   GET /api/funeral-records
 * Query: church_id, page, limit, search, sortField, sortDirection
 * Chrismation: no list API yet — honest empty when filtered live.
 */

export const RECORDS_LIST_API_PATH: Readonly<Record<RecordType, string | null>> = {
  baptism: "/api/baptism-records",
  marriage: "/api/marriage-records",
  funeral: "/api/funeral-records",
  chrismation: null,
};

export const LIVE_LIST_RECORD_TYPES: readonly RecordType[] = [
  "baptism",
  "marriage",
  "funeral",
];

export type RecordsListMeta = {
  readonly totalRecords: number;
  readonly currentPage: number;
  readonly totalPages: number;
};

export type FetchRecordsListResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly records: readonly SacramentalRecord[];
      readonly meta: RecordsListMeta;
      readonly note: string | null;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** Pure unwrap of GET /api/*-records list payloads. */
export function unwrapRecordsListPayload(payload: unknown): {
  readonly rows: readonly Record<string, unknown>[];
  readonly meta: RecordsListMeta;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const rawList = obj.records ?? obj.data;
  if (!Array.isArray(rawList)) return null;

  const rows: Record<string, unknown>[] = [];
  for (const row of rawList) {
    if (row && typeof row === "object") rows.push(row as Record<string, unknown>);
  }

  const limitFallback = Math.max(1, rows.length || 1);
  const totalRecords = asNumber(obj.totalRecords ?? obj.total) ?? rows.length;
  const currentPage = asNumber(obj.currentPage ?? obj.page) ?? 1;
  const totalPages =
    asNumber(obj.totalPages) ??
    Math.max(1, Math.ceil(totalRecords / limitFallback));

  return {
    rows,
    meta: { totalRecords, currentPage, totalPages },
  };
}

/** Map OM record status strings into portal list badges. */
export function mapRecordStatus(raw: unknown): SacramentalRecord["status"] {
  const normalized = asString(raw).trim().toLowerCase();
  if (normalized === "draft") return "draft";
  if (
    normalized.includes("review") ||
    normalized === "pending" ||
    normalized === "needs-review"
  ) {
    return "needs-review";
  }
  return "complete";
}

function formatListDate(val: unknown): string {
  if (val == null || val === "") return "—";
  const str = asString(val).trim();
  if (!str) return "—";
  if (/^\w+ \d{1,2}, \d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str.slice(0, 10);
}

/** Display name for a sacramental row (list chrome parity). */
export function personNameFromRow(
  row: Record<string, unknown>,
  type: RecordType,
): string {
  if (type === "marriage") {
    const pair = [
      [row.fname_groom, row.lname_groom],
      [row.fname_bride, row.lname_bride],
    ]
      .map((parts) =>
        parts
          .map((v) => asString(v).trim())
          .filter(Boolean)
          .join(" "),
      )
      .filter(Boolean)
      .join(" & ");
    if (pair) return pair;
  }
  const person = [
    row.first_name ?? row.name,
    row.last_name ?? row.lastname,
  ]
    .map((v) => asString(v).trim())
    .filter(Boolean)
    .join(" ");
  if (person) return person;
  const id = asNumber(row.id);
  return id != null ? `Record #${String(id)}` : "—";
}

function eventDateFromRow(row: Record<string, unknown>, type: RecordType): string {
  if (type === "marriage") return formatListDate(row.mdate ?? row.marriageDate);
  if (type === "funeral") {
    return formatListDate(row.burial_date ?? row.deceased_date ?? row.burialDate);
  }
  if (type === "chrismation") {
    return formatListDate(row.chrismation_date ?? row.reception_date);
  }
  return formatListDate(row.reception_date ?? row.dateOfBaptism);
}

/** Map one API row into portal list model (pure). */
export function mapRowToSacramentalRecord(
  row: Record<string, unknown>,
  type: RecordType,
): SacramentalRecord | null {
  const id = asNumber(row.id);
  if (id == null || id <= 0) return null;
  return {
    id: `${type}:${String(id)}`,
    type,
    personName: personNameFromRow(row, type),
    date: eventDateFromRow(row, type),
    clergy: asString(row.clergy ?? row.priest).trim() || "—",
    status: mapRecordStatus(row.status),
  };
}

export function mapRowsToSacramentalRecords(
  rows: readonly Record<string, unknown>[],
  type: RecordType,
): SacramentalRecord[] {
  const out: SacramentalRecord[] = [];
  for (const row of rows) {
    const mapped = mapRowToSacramentalRecord(row, type);
    if (mapped) out.push(mapped);
  }
  return out;
}

function sortRecordsByDateDesc(
  records: readonly SacramentalRecord[],
): SacramentalRecord[] {
  return [...records].sort((a, b) => {
    const ad = a.date === "—" ? "" : a.date;
    const bd = b.date === "—" ? "" : b.date;
    return bd.localeCompare(ad);
  });
}

function buildRecordsListUrl(
  type: RecordType,
  opts: {
    readonly churchId: number;
    readonly page: number;
    readonly limit: number;
    readonly search: string;
  },
): string | null {
  const base = RECORDS_LIST_API_PATH[type];
  if (!base) return null;
  const params = new URLSearchParams({
    church_id: String(opts.churchId),
    page: String(opts.page),
    limit: String(opts.limit),
    sortField: "id",
    sortDirection: "desc",
  });
  const search = opts.search.trim();
  if (search) params.set("search", search);
  return `${base}?${params.toString()}`;
}

async function fetchSingleTypeRecordsList(opts: {
  readonly churchId: number;
  readonly type: RecordType;
  readonly page: number;
  readonly limit: number;
  readonly search: string;
}): Promise<FetchRecordsListResult> {
  const url = buildRecordsListUrl(opts.type, opts);
  if (!url) {
    return {
      ok: true,
      source: "live",
      records: [],
      meta: { totalRecords: 0, currentPage: 1, totalPages: 1 },
      note: "Chrismation list API is not available yet.",
    };
  }

  try {
    const res = await apiFetch(url, { method: "GET" });
    if (!res.ok) {
      return {
        ok: false,
        message: `${opts.type} records unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const data = await res.json().catch(() => null);
    const unwrapped = unwrapRecordsListPayload(data);
    if (!unwrapped) {
      return {
        ok: false,
        message: `Unexpected ${opts.type} records response.`,
        status: 502,
      };
    }
    return {
      ok: true,
      source: "live",
      records: mapRowsToSacramentalRecords(unwrapped.rows, opts.type),
      meta: unwrapped.meta,
      note: null,
    };
  } catch {
    return {
      ok: false,
      message: `Network error loading ${opts.type} records.`,
      status: 0,
    };
  }
}

/**
 * Live seam: parish sacramental records list/search.
 * Mock mode returns MOCK_RECORDS (client filter in RecordsPage).
 */
export async function fetchSacramentalRecordsList(opts: {
  readonly churchId?: number | null;
  readonly typeFilter: RecordsTypeFilter;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}): Promise<FetchRecordsListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.max(1, Math.min(200, opts.limit ?? 25));
  const search = (opts.search ?? "").trim();

  if (authMode !== "live") {
    return {
      ok: true,
      source: "mock",
      records: [...MOCK_RECORDS],
      meta: {
        totalRecords: MOCK_RECORDS.length,
        currentPage: 1,
        totalPages: 1,
      },
      note: null,
    };
  }

  if (opts.churchId == null || opts.churchId <= 0) {
    return {
      ok: false,
      message: "Church context required to list sacramental records.",
      status: 400,
    };
  }

  const churchId = opts.churchId;

  if (opts.typeFilter === "chrismation") {
    return {
      ok: true,
      source: "live",
      records: [],
      meta: { totalRecords: 0, currentPage: 1, totalPages: 1 },
      note: "Chrismation list API is not available yet.",
    };
  }

  if (opts.typeFilter !== "all") {
    return fetchSingleTypeRecordsList({
      churchId,
      type: opts.typeFilter,
      page,
      limit,
      search,
    });
  }

  const results = await Promise.all(
    LIVE_LIST_RECORD_TYPES.map((type) =>
      fetchSingleTypeRecordsList({
        churchId,
        type,
        page: 1,
        limit,
        search,
      }),
    ),
  );

  const failures = results.filter((r): r is Extract<FetchRecordsListResult, { ok: false }> => !r.ok);
  const successes = results.filter(
    (r): r is Extract<FetchRecordsListResult, { ok: true }> => r.ok,
  );

  if (successes.length === 0 && failures[0]) {
    return failures[0];
  }

  const merged = sortRecordsByDateDesc(successes.flatMap((r) => r.records));
  const totalRecords = successes.reduce((sum, r) => sum + r.meta.totalRecords, 0);

  return {
    ok: true,
    source: "live",
    records: merged.slice(0, limit),
    meta: {
      totalRecords,
      currentPage: 1,
      totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    },
    note:
      "Combined baptism, marriage, and funeral results. Use a type filter for full API pagination.",
  };
}
