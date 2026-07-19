import { apiFetch } from "../../auth/apiFetch";

/**
 * Live OCR job API client for Customer Portal (Wave BP / F).
 * Parity: legacy Portal OCR desktop uses church-scoped job routes.
 */

export type OcrJobDto = {
  readonly id: string;
  readonly filename: string;
  readonly original_filename?: string;
  readonly status: string;
  readonly review_status?: string | null;
  readonly record_type?: string | null;
  readonly created_at?: string;
  readonly error_message?: string | null;
};

export type FetchOcrJobsResult =
  | { readonly ok: true; readonly jobs: readonly OcrJobDto[] }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type UploadOcrJobsResult =
  | { readonly ok: true; readonly jobs: readonly OcrJobDto[] }
  | { readonly ok: false; readonly message: string; readonly status: number };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function unwrapJobs(payload: unknown): OcrJobDto[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const list = (obj.jobs ?? obj.data ?? obj.results ?? payload) as unknown;
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => {
      const id = asString(row.id);
      const filename = asString(row.filename ?? row.original_filename, "job");
      const job: OcrJobDto = {
        id,
        filename,
        status: asString(row.status, "unknown"),
      };
      if (typeof row.original_filename === "string") {
        (job as { original_filename?: string }).original_filename =
          row.original_filename;
      }
      if (typeof row.review_status === "string") {
        (job as { review_status?: string }).review_status = row.review_status;
      } else if (row.review_status === null) {
        (job as { review_status?: string | null }).review_status = null;
      }
      if (typeof row.record_type === "string") {
        (job as { record_type?: string }).record_type = row.record_type;
      } else if (row.record_type === null) {
        (job as { record_type?: string | null }).record_type = null;
      }
      if (typeof row.created_at === "string") {
        (job as { created_at?: string }).created_at = row.created_at;
      }
      if (typeof row.error_message === "string") {
        (job as { error_message?: string }).error_message = row.error_message;
      } else if (row.error_message === null) {
        (job as { error_message?: string | null }).error_message = null;
      }
      return job;
    })
    .filter((job) => job.id.length > 0);
}

/** GET /api/church/:churchId/ocr/jobs */
export async function fetchChurchOcrJobs(
  churchId: number,
  limit = 50,
): Promise<FetchOcrJobsResult> {
  if (!Number.isFinite(churchId) || churchId <= 0) {
    return { ok: false, message: "Invalid church id.", status: 400 };
  }

  try {
    const res = await apiFetch(
      `/api/church/${String(churchId)}/ocr/jobs?limit=${String(limit)}`,
      { method: "GET" },
    );

    if (!res.ok) {
      return {
        ok: false,
        message: `OCR jobs request failed (${String(res.status)}).`,
        status: res.status,
      };
    }

    const data = await res.json().catch(() => null);
    return { ok: true, jobs: unwrapJobs(data) };
  } catch {
    return {
      ok: false,
      message: "Network error loading OCR jobs.",
      status: 0,
    };
  }
}

/** POST /api/ocr/jobs/upload — multipart page upload (legacy parity). */
export async function uploadOcrJobPages(opts: {
  readonly churchId: number;
  readonly files: readonly File[];
  readonly recordType: string;
  readonly language?: string;
  readonly recordLayoutMode?: string;
}): Promise<UploadOcrJobsResult> {
  if (!opts.files.length) {
    return { ok: false, message: "No files selected.", status: 400 };
  }
  const form = new FormData();
  for (const file of opts.files) {
    form.append("files", file);
  }
  form.append("churchId", String(opts.churchId));
  form.append("recordType", opts.recordType.toLowerCase());
  form.append("language", opts.language ?? "en");
  form.append("recordLayoutMode", opts.recordLayoutMode ?? "auto");

  try {
    const res = await apiFetch("/api/ocr/jobs/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      return {
        ok: false,
        message:
          body?.message ??
          body?.error ??
          `OCR upload failed (${String(res.status)}).`,
        status: res.status,
      };
    }
    const data = await res.json().catch(() => null);
    return { ok: true, jobs: unwrapJobs(data) };
  } catch {
    return { ok: false, message: "Network error uploading OCR pages.", status: 0 };
  }
}

export type WizardJobStatus =
  | "processing"
  | "ready-for-review"
  | "completed"
  | "failed";

export type OcrJobActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly status: number };

async function parseErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    message?: string;
    error?: string;
  } | null;
  return body?.message ?? body?.error ?? fallback;
}

/**
 * POST /api/church/:churchId/ocr/jobs/:jobId/retry
 * Parity: legacy UploadRecords / OCR studio retry failed or reprocessable jobs.
 */
export async function retryChurchOcrJob(
  churchId: number,
  jobId: string,
): Promise<OcrJobActionResult> {
  if (!Number.isFinite(churchId) || churchId <= 0 || !jobId) {
    return { ok: false, message: "Invalid church or job id.", status: 400 };
  }
  try {
    const res = await apiFetch(
      `/api/church/${String(churchId)}/ocr/jobs/${encodeURIComponent(jobId)}/retry`,
      { method: "POST" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: await parseErrorMessage(
          res,
          `OCR retry failed (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error retrying OCR job.", status: 0 };
  }
}

/**
 * POST /api/church/:churchId/ocr/jobs/:jobId/seed
 * Parity: legacy church-scoped seed when review_status is ready_to_seed.
 */
export async function seedChurchOcrJob(
  churchId: number,
  jobId: string,
): Promise<OcrJobActionResult> {
  if (!Number.isFinite(churchId) || churchId <= 0 || !jobId) {
    return { ok: false, message: "Invalid church or job id.", status: 400 };
  }
  try {
    const res = await apiFetch(
      `/api/church/${String(churchId)}/ocr/jobs/${encodeURIComponent(jobId)}/seed`,
      { method: "POST" },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: await parseErrorMessage(
          res,
          `OCR seed failed (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error seeding OCR job.", status: 0 };
  }
}

export function mapOcrJobToWizardStatus(job: {
  readonly status: string;
  readonly review_status?: string | null;
}): WizardJobStatus {
  const reviewStatus = job.review_status ?? "uploaded";
  if (job.status === "failed" || job.status === "error") return "failed";
  if (reviewStatus === "seeded") return "completed";
  if (reviewStatus === "agent_extracted" || reviewStatus === "ready_to_seed") {
    return "ready-for-review";
  }
  return "processing";
}

/** True when history UI should offer retry (failed/error jobs). */
export function canRetryOcrJob(job: {
  readonly status: string;
  readonly review_status?: string | null;
}): boolean {
  const status = job.status.toLowerCase();
  return status === "failed" || status === "error";
}

/** True when a live job is eligible for seed API. */
export function canSeedOcrJob(job: {
  readonly review_status?: string | null;
}): boolean {
  return job.review_status === "ready_to_seed";
}

const TERMINAL_REVIEW_STATUSES = new Set([
  "agent_extracted",
  "ready_to_seed",
  "seeded",
  "returned",
]);

/** True once OCR pipeline reached a stage where background processing finished. */
export function isOcrJobTerminal(job: {
  readonly status: string;
  readonly review_status?: string | null;
}): boolean {
  const status = job.status.toLowerCase();
  if (status === "failed" || status === "error") return true;
  const reviewStatus = job.review_status ?? "uploaded";
  return TERMINAL_REVIEW_STATUSES.has(reviewStatus);
}

/** True when GET …/jobs/:jobId/download may return OCR text or JSON. */
export function canDownloadOcrJob(job: {
  readonly status: string;
  readonly review_status?: string | null;
}): boolean {
  const wizard = mapOcrJobToWizardStatus(job);
  return wizard === "ready-for-review" || wizard === "completed";
}

/** Church-scoped page image URL (legacy parity). */
export function ocrJobImageUrl(churchId: number, jobId: string): string {
  return `/api/church/${String(churchId)}/ocr/jobs/${encodeURIComponent(jobId)}/image`;
}

export type DownloadOcrJobResult =
  | { readonly ok: true; readonly filename: string }
  | { readonly ok: false; readonly message: string };

/**
 * GET /api/church/:churchId/ocr/jobs/:jobId/download — TXT (default) or JSON export.
 * Uses authenticated apiFetch (session/JWT); direct anchor hrefs omit Authorization.
 */
export async function downloadOcrJobResults(opts: {
  readonly churchId: number;
  readonly jobId: string;
  readonly format?: "txt" | "json";
  readonly filenameHint?: string;
}): Promise<DownloadOcrJobResult> {
  if (!Number.isFinite(opts.churchId) || opts.churchId <= 0 || !opts.jobId) {
    return { ok: false, message: "Invalid church or job id." };
  }

  const format = opts.format ?? "txt";
  const query = format === "json" ? "?format=json" : "";

  try {
    const res = await apiFetch(
      `/api/church/${String(opts.churchId)}/ocr/jobs/${encodeURIComponent(opts.jobId)}/download${query}`,
      {
        method: "GET",
        headers: {
          Accept: format === "json" ? "application/json" : "text/plain",
        },
      },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Download failed (${String(res.status)}).`,
      };
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/i.exec(disposition);
    const filename =
      match?.[1] ??
      opts.filenameHint ??
      `ocr-job-${opts.jobId}.${format === "json" ? "json" : "txt"}`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
    return { ok: true, filename };
  } catch {
    return { ok: false, message: "Network error downloading OCR results." };
  }
}

/** Honest MVP scope notes — full review studio remains legacy/deferred. */
export const OCR_LIVE_CUTOFF_NOTES = [
  "Field review, crop/rotate, and confirm-extract run in legacy OCR studio until Wave H parity.",
  "Batch delete and mobile QR pairing are not wired in Customer Portal MVP.",
  "Configure/review wizard steps after upload are preview chrome; live upload + history Retry/Seed/Download use OM APIs.",
] as const;
