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
