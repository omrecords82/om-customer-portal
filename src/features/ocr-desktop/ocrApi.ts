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
