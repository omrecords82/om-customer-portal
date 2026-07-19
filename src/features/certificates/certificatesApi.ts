import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import type { CertificateKind, CertificateRow } from "./certificatesData";
import { MOCK_CERTIFICATES } from "./certificatesData";

/**
 * Wave F certificate live client.
 * Parity: Certificate Studio (`/api/certificates/*`)
 *   - GET  /api/certificates/history — list/generation history
 *   - GET  /api/certificates/history/:id/download — PDF (auth required)
 *   - GET  /api/certificates/templates — template picker
 *   - GET  /api/certificates/records/:certificateType — sacramental record picker
 *   - POST /api/certificates/render — requires template_id + record_id
 * Canvas/designer remains app-owned (not implemented here).
 */

/** Studio generate types (server CERTIFICATE_TYPES). */
export type CertificateStudioType = "baptism" | "marriage" | "reception";

export type CertificateTemplateOption = {
  readonly id: number;
  readonly name: string;
  readonly certificateType: CertificateStudioType;
  readonly status: string;
  readonly isDefault: boolean;
  readonly scopeLabel: string | null;
};

export type CertificateRecordOption = {
  readonly id: number;
  readonly label: string;
  readonly dateLabel: string | null;
};

export type FetchCertificatesResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly rows: readonly CertificateRow[];
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type FetchTemplatesResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly templates: readonly CertificateTemplateOption[];
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type FetchRecordsResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly records: readonly CertificateRecordOption[];
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type RenderCertificateBody = {
  readonly template_id: number;
  readonly record_id: number;
  readonly certificate_type: CertificateStudioType;
  readonly church_id: number;
  readonly force?: boolean;
};

export type RenderCertificateSuccess = {
  readonly jobId: number | null;
  readonly historyId: number | null;
  readonly status: string;
  readonly downloadUrl: string | null;
};

export type RenderCertificateResult =
  | {
      readonly ok: true;
      readonly source: "live";
      readonly result: RenderCertificateSuccess;
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly status: number;
      readonly missingFields?: readonly string[];
    };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeCertificateStudioType(
  raw: unknown,
): CertificateStudioType {
  const kind = asString(raw).toLowerCase();
  if (kind === "marriage") return "marriage";
  if (kind === "reception") return "reception";
  return "baptism";
}

/** Map studio + portal kind strings onto CertificateRow.kind. */
export function normalizeCertificateKind(raw: unknown): CertificateKind {
  const kind = asString(raw).toLowerCase();
  if (kind === "marriage") return "marriage";
  if (kind === "chrismation") return "chrismation";
  if (kind === "reception") return "reception";
  return "baptism";
}

function parseSnapshot(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Derive a display recipient from studio history fields + optional record snapshot.
 */
export function recipientFromHistoryRow(row: Record<string, unknown>): string {
  const direct = asString(
    row.recipient_name ?? row.recipient ?? row.person_name,
  ).trim();
  if (direct) return direct;

  const snapshot = parseSnapshot(
    row.record_snapshot_json ?? row.record_snapshot ?? row.snapshot,
  );
  if (snapshot) {
    const kind = normalizeCertificateKind(
      row.certificate_type ?? row.kind ?? snapshot.certificate_type,
    );
    if (kind === "marriage") {
      const groom = [snapshot.fname_groom, snapshot.lname_groom]
        .map((v) => asString(v).trim())
        .filter(Boolean)
        .join(" ");
      const bride = [snapshot.fname_bride, snapshot.lname_bride]
        .map((v) => asString(v).trim())
        .filter(Boolean)
        .join(" ");
      const pair = [groom, bride].filter(Boolean).join(" & ");
      if (pair) return pair;
    }
    const person = [
      snapshot.first_name ?? snapshot.name,
      snapshot.last_name ?? snapshot.lastname,
    ]
      .map((v) => asString(v).trim())
      .filter(Boolean)
      .join(" ");
    if (person) return person;
  }

  const recordId = asNumber(row.record_id);
  if (recordId != null) return `Record #${String(recordId)}`;
  return "—";
}

function mapHistoryStatus(row: Record<string, unknown>): CertificateRow["status"] {
  const statusRaw = asString(row.status, "").toLowerCase();
  if (statusRaw === "draft" || statusRaw === "void") return statusRaw;
  // Generation history rows from studio are completed PDFs.
  return "issued";
}

/** Pure unwrap of GET /api/certificates/history payloads. */
export function unwrapCertificateHistory(payload: unknown): CertificateRow[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const list = obj.history ?? obj.entries ?? obj.data ?? obj.results;
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, index) => {
      const idNum = asNumber(row.id);
      const id = idNum != null ? String(idNum) : asString(row.id, `cert-${String(index)}`);
      const kind = normalizeCertificateKind(row.certificate_type ?? row.kind);
      const issued =
        asString(row.generated_at ?? row.created_at ?? row.issued).slice(0, 10) ||
        "—";
      const templateName = asString(row.template_name ?? row.templateName).trim();
      const recordId = asNumber(row.record_id);
      const rowOut: CertificateRow = {
        id,
        kind,
        recipient: recipientFromHistoryRow(row),
        issued,
        status: mapHistoryStatus(row),
        ...(templateName ? { templateName } : {}),
        ...(recordId != null ? { recordId } : {}),
      };
      return rowOut;
    });
}

/** Pure unwrap of GET /api/certificates/templates payloads. */
export function unwrapCertificateTemplates(
  payload: unknown,
): CertificateTemplateOption[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const list = obj.templates ?? obj.data;
  if (!Array.isArray(list)) return [];
  const out: CertificateTemplateOption[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = asNumber(r.id);
    if (id == null || id <= 0) continue;
    const name = asString(r.name).trim() || `Template #${String(id)}`;
    out.push({
      id,
      name,
      certificateType: normalizeCertificateStudioType(r.certificate_type),
      status: asString(r.status, "unknown").toLowerCase(),
      isDefault: r.is_default === true || r.is_default === 1,
      scopeLabel: asString(r.scope_label).trim() || null,
    });
  }
  return out;
}

/** Display label for a sacramental record row (studio generate parity). */
export function recordLabelFromRow(
  row: Record<string, unknown>,
  certificateType: CertificateStudioType,
): string {
  if (certificateType === "marriage") {
    const pair = [
      [row.fname_groom, row.lname_groom],
      [row.fname_bride, row.lname_bride],
    ]
      .map((pairParts) =>
        pairParts
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

function formatRecordDate(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val !== "string" && typeof val !== "number") return null;
  const str = String(val);
  if (/^\w+ \d{1,2}, \d{4}$/.test(str)) return str;
  try {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(str) ? `${str}T12:00:00` : str;
    const d = new Date(safe);
    if (Number.isNaN(d.getTime())) return str.slice(0, 10);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return str.slice(0, 10);
  }
}

/** Pure unwrap of GET /api/certificates/records/:type payloads. */
export function unwrapCertificateRecords(
  payload: unknown,
  certificateType: CertificateStudioType,
): CertificateRecordOption[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const list = obj.records ?? obj.data;
  if (!Array.isArray(list)) return [];
  const out: CertificateRecordOption[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = asNumber(r.id);
    if (id == null || id <= 0) continue;
    out.push({
      id,
      label: recordLabelFromRow(r, certificateType),
      dateLabel: formatRecordDate(
        r.mdate ?? r.reception_date ?? r.date_of_baptism ?? r.baptism_date,
      ),
    });
  }
  return out;
}

/**
 * Pure builder for POST /api/certificates/render body.
 * Returns null when required ids / church context are missing.
 */
export function buildRenderCertificateBody(opts: {
  readonly templateId: number | string | null | undefined;
  readonly recordId: number | string | null | undefined;
  readonly certificateType: CertificateStudioType;
  readonly churchId: number | null | undefined;
  readonly force?: boolean;
}): RenderCertificateBody | null {
  const templateId = asNumber(opts.templateId);
  const recordId = asNumber(opts.recordId);
  const churchId = asNumber(opts.churchId);
  if (
    templateId == null ||
    templateId <= 0 ||
    recordId == null ||
    recordId <= 0 ||
    churchId == null ||
    churchId <= 0
  ) {
    return null;
  }
  const body: RenderCertificateBody = {
    template_id: templateId,
    record_id: recordId,
    certificate_type: normalizeCertificateStudioType(opts.certificateType),
    church_id: churchId,
  };
  if (opts.force) {
    return { ...body, force: true };
  }
  return body;
}

/** Pure unwrap of successful POST /api/certificates/render JSON. */
export function parseRenderCertificateResponse(
  payload: unknown,
): RenderCertificateSuccess | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const historyId = asNumber(obj.history_id ?? obj.historyId);
  const jobId = asNumber(obj.job_id ?? obj.jobId);
  const status = asString(obj.status, "completed") || "completed";
  const downloadUrl =
    asString(obj.download_url ?? obj.downloadUrl).trim() ||
    (historyId != null
      ? `/api/certificates/history/${String(historyId)}/download`
      : null);
  // Studio always returns at least history_id on success; accept job-only edge cases.
  if (historyId == null && jobId == null) return null;
  return {
    jobId,
    historyId,
    status,
    downloadUrl,
  };
}

/**
 * Live seam: GET `/api/certificates/history` when auth is live + churchId.
 * Honest empty/error otherwise (never presents mock rows as live).
 */
export async function fetchCertificateHistory(
  churchId?: number | null,
): Promise<FetchCertificatesResult> {
  if (authMode !== "live") {
    return { ok: true, source: "mock", rows: MOCK_CERTIFICATES };
  }
  if (churchId == null || churchId <= 0) {
    return {
      ok: false,
      message: "Church context required for certificate history.",
      status: 400,
    };
  }

  try {
    const res = await apiFetch(
      `/api/certificates/history?church_id=${String(churchId)}&limit=50`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Certificate history unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const data = await res.json().catch(() => null);
    return { ok: true, source: "live", rows: unwrapCertificateHistory(data) };
  } catch {
    return {
      ok: false,
      message: "Network error loading certificate history.",
      status: 0,
    };
  }
}

/**
 * Live seam: GET `/api/certificates/templates` for generate picker.
 * Mock mode returns empty list with source "mock" (no fake templates as live).
 */
export async function fetchCertificateTemplates(opts: {
  readonly churchId?: number | null;
  readonly certificateType: CertificateStudioType;
}): Promise<FetchTemplatesResult> {
  if (authMode !== "live") {
    return { ok: true, source: "mock", templates: [] };
  }
  if (opts.churchId == null || opts.churchId <= 0) {
    return {
      ok: false,
      message: "Church context required to list certificate templates.",
      status: 400,
    };
  }

  try {
    const params = new URLSearchParams({
      church_id: String(opts.churchId),
      certificate_type: opts.certificateType,
      include_global: "1",
      status: "active",
    });
    const res = await apiFetch(`/api/certificates/templates?${params.toString()}`, {
      method: "GET",
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Certificate templates unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const data = await res.json().catch(() => null);
    return {
      ok: true,
      source: "live",
      templates: unwrapCertificateTemplates(data),
    };
  } catch {
    return {
      ok: false,
      message: "Network error loading certificate templates.",
      status: 0,
    };
  }
}

/**
 * Live seam: GET `/api/certificates/records/:type` for sacramental record picker.
 * Mock mode returns empty list with source "mock".
 */
export async function fetchCertificateRecords(opts: {
  readonly churchId?: number | null;
  readonly certificateType: CertificateStudioType;
  readonly search?: string;
}): Promise<FetchRecordsResult> {
  if (authMode !== "live") {
    return { ok: true, source: "mock", records: [] };
  }
  if (opts.churchId == null || opts.churchId <= 0) {
    return {
      ok: false,
      message: "Church context required to list sacramental records.",
      status: 400,
    };
  }

  try {
    const params = new URLSearchParams({
      church_id: String(opts.churchId),
      limit: "50",
    });
    const search = (opts.search ?? "").trim();
    if (search) params.set("search", search);
    const res = await apiFetch(
      `/api/certificates/records/${opts.certificateType}?${params.toString()}`,
      { method: "GET" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Sacramental records unavailable (${String(res.status)}).`,
        status: res.status,
      };
    }
    const data = await res.json().catch(() => null);
    return {
      ok: true,
      source: "live",
      records: unwrapCertificateRecords(data, opts.certificateType),
    };
  } catch {
    return {
      ok: false,
      message: "Network error loading sacramental records.",
      status: 0,
    };
  }
}

/**
 * Live seam: POST `/api/certificates/render` with required template_id + record_id.
 * Mock mode refuses with clear messaging (never reports fake success as live).
 */
export async function renderCertificate(opts: {
  readonly templateId: number | string | null | undefined;
  readonly recordId: number | string | null | undefined;
  readonly certificateType: CertificateStudioType;
  readonly churchId?: number | null;
  readonly force?: boolean;
}): Promise<RenderCertificateResult> {
  if (authMode !== "live") {
    return {
      ok: false,
      message:
        "PDF render is unavailable in preview/mock mode. Switch AUTH_MODE=live with church context to call POST /api/certificates/render.",
      status: 0,
    };
  }

  const body = buildRenderCertificateBody({
    templateId: opts.templateId,
    recordId: opts.recordId,
    certificateType: opts.certificateType,
    churchId: opts.churchId,
    ...(opts.force ? { force: true } : {}),
  });
  if (!body) {
    return {
      ok: false,
      message:
        "template_id, record_id, and church context are required to render a certificate.",
      status: 400,
    };
  }

  try {
    const res = await apiFetch("/api/certificates/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const errObj =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : null;
      const missingRaw = errObj?.missing_fields;
      const missingFields = Array.isArray(missingRaw)
        ? missingRaw.map((f) => String(f))
        : undefined;
      const errMsg = asString(errObj?.error).trim();
      return {
        ok: false,
        message:
          errMsg ||
          `Certificate render failed (${String(res.status)}).`,
        status: res.status,
        ...(missingFields?.length ? { missingFields } : {}),
      };
    }
    const parsed = parseRenderCertificateResponse(data);
    if (!parsed) {
      return {
        ok: false,
        message: "Certificate render returned an unexpected payload.",
        status: res.status,
      };
    }
    return { ok: true, source: "live", result: parsed };
  } catch {
    return {
      ok: false,
      message: "Network error rendering certificate.",
      status: 0,
    };
  }
}

export type DownloadCertificateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/**
 * Authenticated PDF download (session/JWT). Direct anchor hrefs omit Authorization.
 */
export async function downloadCertificatePdf(
  historyId: string | number,
  filename?: string,
): Promise<DownloadCertificateResult> {
  const id = String(historyId).trim();
  if (!id || id.startsWith("c") || id.startsWith("mock") || id.startsWith("stub")) {
    return {
      ok: false,
      message: "PDF download is available for live history rows only.",
    };
  }
  if (authMode !== "live") {
    return {
      ok: false,
      message: "PDF download requires live auth.",
    };
  }

  try {
    const res = await apiFetch(`/api/certificates/history/${id}/download`, {
      method: "GET",
      headers: { Accept: "application/pdf" },
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Download failed (${String(res.status)}).`,
      };
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename ?? `certificate-${id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error downloading certificate PDF." };
  }
}
