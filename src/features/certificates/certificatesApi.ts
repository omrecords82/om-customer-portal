import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import type { CertificateKind, CertificateRow } from "./certificatesData";
import { MOCK_CERTIFICATES } from "./certificatesData";

/**
 * Wave F certificate live client.
 * Parity: Certificate Studio (`/api/certificates/*`)
 *   - GET  /api/certificates/history — list/generation history
 *   - GET  /api/certificates/history/:id/download — PDF (auth required)
 *   - POST /api/certificates/render — requires template_id + record_id (studio);
 *     not invoked from recipient-only draft chrome (unsafe without those ids).
 */

export type FetchCertificatesResult =
  | {
      readonly ok: true;
      readonly source: "mock" | "live";
      readonly rows: readonly CertificateRow[];
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
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

export type StartCertificateDraftResult =
  | {
      readonly ok: true;
      readonly draftId: string;
      readonly source: "mock" | "deferred";
      readonly message: string;
    }
  | { readonly ok: false; readonly message: string };

/**
 * Draft chrome helper — does **not** call POST /api/certificates/render.
 * Render requires template_id + record_id from Certificate Studio; inventing
 * those from a recipient name alone would issue incorrect certificates.
 */
export function startCertificateDraft(opts: {
  readonly recipient: string;
  readonly kind?: CertificateKind;
  readonly churchId?: number | null;
}): StartCertificateDraftResult {
  const recipient = opts.recipient.trim();
  if (!recipient) {
    return { ok: false, message: "Enter a recipient name to start a draft." };
  }
  if (authMode !== "live" || opts.churchId == null || opts.churchId <= 0) {
    return {
      ok: true,
      draftId: `mock-draft-${String(Date.now())}`,
      source: "mock",
      message: `Mock draft for ${recipient}. Switch AUTH_MODE=live with church context for live history; PDF render stays in Certificate Studio (template + record required).`,
    };
  }
  return {
    ok: true,
    draftId: `deferred-${String(opts.churchId)}-${String(Date.now())}`,
    source: "deferred",
    message: `Live draft for ${recipient} is deferred: POST /api/certificates/render needs template_id and record_id (studio generate). Canvas/designer remains app-owned.`,
  };
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
