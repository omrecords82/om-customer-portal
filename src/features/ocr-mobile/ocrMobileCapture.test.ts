import { describe, expect, it, beforeEach } from "vitest";
import {
  buildMockDemoPages,
  createCapturePageFromFile,
  createCapturePagesFromFiles,
  markPagesFailed,
  markPagesUploaded,
  resetCapturePageIdSeqForTests,
  thumbBg,
} from "./ocrMobileCapture";

describe("ocrMobileCapture", () => {
  beforeEach(() => {
    resetCapturePageIdSeqForTests();
  });

  it("cycles thumb backgrounds", () => {
    expect(thumbBg(0)).toMatch(/^#/);
    expect(thumbBg(12)).toBe(thumbBg(0));
  });

  it("builds mock demo pages with failed uploads for preview", () => {
    const demo = buildMockDemoPages();
    expect(demo).toHaveLength(12);
    expect(demo.some((p) => p.upload === "failed")).toBe(true);
    expect(demo.some((p) => p.quality === "blurry")).toBe(true);
  });

  it("maps files to capture pages", () => {
    const files = [
      new File(["a"], "page-a.jpg", { type: "image/jpeg" }),
      new File(["b"], "page-b.jpg", { type: "image/jpeg" }),
    ];
    const pages = createCapturePagesFromFiles(files, 0, "uploading");
    expect(pages).toHaveLength(2);
    expect(pages[0]?.filename).toBe("page-a.jpg");
    expect(pages[0]?.upload).toBe("uploading");
    expect(pages[1]?.n).toBe(2);
    expect(pages[0]?.id).not.toBe(pages[1]?.id);
  });

  it("marks uploaded / failed by id", () => {
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    const page = createCapturePageFromFile(file, 0, "uploading");
    const uploaded = markPagesUploaded([page], [page.id], ["job-1"]);
    expect(uploaded[0]?.upload).toBe("uploaded");
    expect(uploaded[0]?.jobId).toBe("job-1");

    const failed = markPagesFailed([page], [page.id]);
    expect(failed[0]?.upload).toBe("failed");
  });
});
