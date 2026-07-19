import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import type { BaptismRecordCreate, BaptismRecordUpdate } from "@om/contracts";

import {
  baptismRowToFormState,
  parseBaptismRowFromApi,
  type BaptismFormState,
} from "./baptismEditorMappers";

export type LookupOption = {
  readonly value: string;
  readonly label: string;
};

export type BaptismEditorResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly message: string };

export function buildBaptismRecordGetUrl(
  recordId: number,
  churchId: number,
): string {
  const params = new URLSearchParams({ church_id: String(churchId) });
  return `/api/baptism-records/${String(recordId)}?${params.toString()}`;
}

export function buildClergyLookupUrl(
  churchId: number,
  opts?: { readonly search?: string; readonly limit?: number },
): string {
  const params = new URLSearchParams({
    church_id: String(churchId),
    record_type: "baptism",
    limit: String(opts?.limit ?? 100),
  });
  const search = opts?.search?.trim();
  if (search) params.set("search", search);
  return `/api/lookup/clergy?${params.toString()}`;
}

export function buildLocationsLookupUrl(
  churchId: number,
  opts?: { readonly search?: string; readonly limit?: number },
): string {
  const params = new URLSearchParams({
    church_id: String(churchId),
    types: "Church,Other",
    limit: String(opts?.limit ?? 100),
  });
  const search = opts?.search?.trim();
  if (search) params.set("search", search);
  return `/api/lookup/locations?${params.toString()}`;
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function unwrapLookupItems(payload: unknown): LookupOption[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const raw = obj.items ?? obj.data ?? obj.results;
  if (!Array.isArray(raw)) return [];

  const out: LookupOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const value = asString(row.value ?? row.label).trim();
    if (!value) continue;
    const label = asString(row.label ?? row.value).trim() || value;
    out.push({ value, label });
  }
  return out;
}

export function unwrapSingleBaptismRecord(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const raw = obj.data ?? obj.record ?? obj;
  if (!raw || typeof raw !== "object") return null;
  return parseBaptismRowFromApi(raw);
}

async function readApiError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      const msg = asString(obj.error ?? obj.message).trim();
      if (msg) return msg;
    }
  } catch {
    /* ignore */
  }
  return `Request failed (${String(res.status)})`;
}

export async function fetchBaptismRecord(
  churchId: number,
  recordId: number,
): Promise<BaptismEditorResult<BaptismFormState & { readonly id: number; readonly status: string }>> {
  if (authMode !== "live") {
    return {
      ok: false,
      status: 503,
      message: "Baptism editor requires live auth with church context.",
    };
  }
  if (churchId <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Church context required — sign in with a parish account.",
    };
  }

  const res = await apiFetch(buildBaptismRecordGetUrl(recordId, churchId));
  if (!res.ok) {
    return { ok: false, status: res.status, message: await readApiError(res) };
  }

  const payload: unknown = await res.json();
  const row = unwrapSingleBaptismRecord(payload);
  if (!row) {
    return { ok: false, status: 502, message: "Could not read baptism record from server." };
  }

  return {
    ok: true,
    data: {
      ...baptismRowToFormState(row),
      id: row.id,
      status: row.status,
    },
  };
}

export async function createBaptismRecord(
  churchId: number,
  body: BaptismRecordCreate,
): Promise<BaptismEditorResult<{ readonly id: number }>> {
  if (authMode !== "live") {
    return {
      ok: false,
      status: 503,
      message: "Baptism editor requires live auth with church context.",
    };
  }
  if (churchId <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Church context required — sign in with a parish account.",
    };
  }

  const res = await apiFetch("/api/baptism-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, church_id: churchId }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, message: await readApiError(res) };
  }

  const payload: unknown = await res.json();
  const row = unwrapSingleBaptismRecord(payload);
  const id =
    row?.id ??
    (payload && typeof payload === "object"
      ? Number((payload as Record<string, unknown>).id)
      : NaN);

  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, status: 502, message: "Record saved but server did not return an id." };
  }

  return { ok: true, data: { id } };
}

export async function updateBaptismRecord(
  churchId: number,
  recordId: number,
  body: BaptismRecordUpdate,
): Promise<BaptismEditorResult<{ readonly id: number }>> {
  if (authMode !== "live") {
    return {
      ok: false,
      status: 503,
      message: "Baptism editor requires live auth with church context.",
    };
  }
  if (churchId <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Church context required — sign in with a parish account.",
    };
  }

  const res = await apiFetch(buildBaptismRecordGetUrl(recordId, churchId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, church_id: churchId }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, message: await readApiError(res) };
  }

  return { ok: true, data: { id: recordId } };
}

export async function fetchClergyOptions(
  churchId: number,
  search?: string,
): Promise<BaptismEditorResult<readonly LookupOption[]>> {
  if (churchId <= 0) {
    return { ok: false, status: 400, message: "Church context required." };
  }
  const res = await apiFetch(
    buildClergyLookupUrl(churchId, search?.trim() ? { search: search.trim() } : {}),
  );
  if (!res.ok) {
    return { ok: false, status: res.status, message: await readApiError(res) };
  }
  const payload: unknown = await res.json();
  return { ok: true, data: unwrapLookupItems(payload) };
}

export async function fetchLocationOptions(
  churchId: number,
  search?: string,
): Promise<BaptismEditorResult<readonly LookupOption[]>> {
  if (churchId <= 0) {
    return { ok: false, status: 400, message: "Church context required." };
  }
  const res = await apiFetch(
    buildLocationsLookupUrl(churchId, search?.trim() ? { search: search.trim() } : {}),
  );
  if (!res.ok) {
    return { ok: false, status: res.status, message: await readApiError(res) };
  }
  const payload: unknown = await res.json();
  return { ok: true, data: unwrapLookupItems(payload) };
}
