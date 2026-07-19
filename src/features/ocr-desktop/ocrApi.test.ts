import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../../auth/apiFetch";
import {
  canRetryOcrJob,
  canSeedOcrJob,
  mapOcrJobToWizardStatus,
  retryChurchOcrJob,
  seedChurchOcrJob,
  uploadOcrJobPages,
} from "./ocrApi";

const mockedApiFetch = vi.mocked(apiFetch);

describe("mapOcrJobToWizardStatus", () => {
  it("maps review and status combinations", () => {
    expect(
      mapOcrJobToWizardStatus({ status: "failed", review_status: "uploaded" }),
    ).toBe("failed");
    expect(
      mapOcrJobToWizardStatus({ status: "done", review_status: "seeded" }),
    ).toBe("completed");
    expect(
      mapOcrJobToWizardStatus({
        status: "processing",
        review_status: "ready_to_seed",
      }),
    ).toBe("ready-for-review");
    expect(
      mapOcrJobToWizardStatus({ status: "running", review_status: "uploaded" }),
    ).toBe("processing");
  });
});

describe("canRetryOcrJob / canSeedOcrJob", () => {
  it("allows retry only for failed/error statuses", () => {
    expect(canRetryOcrJob({ status: "failed" })).toBe(true);
    expect(canRetryOcrJob({ status: "error" })).toBe(true);
    expect(canRetryOcrJob({ status: "processing" })).toBe(false);
  });

  it("allows seed only when ready_to_seed", () => {
    expect(canSeedOcrJob({ review_status: "ready_to_seed" })).toBe(true);
    expect(canSeedOcrJob({ review_status: "agent_extracted" })).toBe(false);
    expect(canSeedOcrJob({ review_status: "seeded" })).toBe(false);
  });
});

describe("retryChurchOcrJob / seedChurchOcrJob", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("POSTs retry to church-scoped job route", async () => {
    mockedApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await retryChurchOcrJob(46, "991");
    expect(result).toEqual({ ok: true });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/church/46/ocr/jobs/991/retry",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("POSTs seed to church-scoped job route", async () => {
    mockedApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await seedChurchOcrJob(46, "992");
    expect(result).toEqual({ ok: true });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/church/46/ocr/jobs/992/seed",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces server error message on seed failure", async () => {
    mockedApiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: "Job is not ready to seed — confirm extraction first",
        }),
    } as Response);

    const result = await seedChurchOcrJob(46, "993");
    expect(result).toEqual({
      ok: false,
      message: "Job is not ready to seed — confirm extraction first",
      status: 400,
    });
  });
});

describe("uploadOcrJobPages", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("POSTs multipart form to /api/ocr/jobs/upload", async () => {
    mockedApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          jobs: [{ id: "u1", filename: "page.jpg", status: "processing" }],
        }),
    } as Response);

    const file = new File(["img"], "page.jpg", { type: "image/jpeg" });
    const result = await uploadOcrJobPages({
      churchId: 46,
      files: [file],
      recordType: "Baptism",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.jobs[0]?.id).toBe("u1");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/ocr/jobs/upload",
      expect.objectContaining({ method: "POST" }),
    );
    const body = mockedApiFetch.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
  });

  it("rejects empty file list without calling the API", async () => {
    const result = await uploadOcrJobPages({
      churchId: 46,
      files: [],
      recordType: "Baptism",
    });
    expect(result).toEqual({
      ok: false,
      message: "No files selected.",
      status: 400,
    });
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
