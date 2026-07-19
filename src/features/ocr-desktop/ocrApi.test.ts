import { describe, expect, it } from "vitest";

import { mapOcrJobToWizardStatus } from "./ocrApi";

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
