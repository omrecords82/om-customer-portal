import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import type { CertificateRow } from "./certificatesData";
import { MOCK_CERTIFICATES } from "./certificatesData";

/**
 * Wave F certificate live seam stubs.
 * Parity targets (not fully wired): GET/POST under `/api/certificates/*`
 * (Certificate Studio: templates, history, render).
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

function unwrapHistory(payload: unknown): CertificateRow[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const list = obj.history ?? obj.entries ?? obj.data ?? obj.results;
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, index) => {
      const id = asString(row.id, `cert-${String(index)}`);
      const kindRaw = asString(
        row.certificate_type ?? row.kind,
        "baptism",
      ).toLowerCase();
      const kind: CertificateRow["kind"] =
        kindRaw === "marriage" || kindRaw === "chrismation" ? kindRaw : "baptism";
      const statusRaw = asString(row.status, "issued").toLowerCase();
      const status: CertificateRow["status"] =
        statusRaw === "draft" || statusRaw === "void" ? statusRaw : "issued";
      return {
        id,
        kind,
        recipient: asString(row.recipient_name ?? row.recipient, "—"),
        issued: asString(row.created_at ?? row.issued).slice(0, 10) || "—",
        status,
      };
    });
}

/**
 * Live seam: GET `/api/certificates/history` when auth is live.
 * Falls back to empty live result (not mock-as-live) on empty payload;
 * returns mock only when authMode is mock.
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
    return { ok: true, source: "live", rows: unwrapHistory(data) };
  } catch {
    return {
      ok: false,
      message: "Network error loading certificate history.",
      status: 0,
    };
  }
}

export type StartCertificateDraftResult =
  | { readonly ok: true; readonly draftId: string; readonly source: "mock" | "stub" }
  | { readonly ok: false; readonly message: string };

/**
 * Live seam stub for starting a certificate draft.
 * Does not invent a full render pipeline — returns a stub id for UI continuity.
 */
export function startCertificateDraft(opts: {
  readonly recipient: string;
  readonly kind?: CertificateRow["kind"];
  readonly churchId?: number | null;
}): StartCertificateDraftResult {
  const recipient = opts.recipient.trim();
  if (!recipient) {
    return { ok: false, message: "Enter a recipient name to start a draft." };
  }
  if (authMode !== "live" || opts.churchId == null) {
    return {
      ok: true,
      draftId: `mock-draft-${String(Date.now())}`,
      source: "mock",
    };
  }
  // Full POST /api/certificates/render (or studio generate) is deferred;
  // stub documents the intended seam without claiming an issued certificate.
  return {
    ok: true,
    draftId: `stub-draft-${String(opts.churchId)}-${String(Date.now())}`,
    source: "stub",
  };
}
