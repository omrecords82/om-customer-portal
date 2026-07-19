/**
 * Pure helpers for OCR Mobile capture-phase page thumbs + file → page mapping.
 * Live upload uses shared `uploadOcrJobPages` from ocr-desktop/ocrApi.
 */

export type UploadStatus = "local" | "uploading" | "uploaded" | "failed";
export type QualityWarning = "blurry" | "glare" | "cropped" | "duplicate" | null;

export type CapturePageItem = {
  readonly id: string;
  readonly n: number;
  readonly bg: string;
  upload: UploadStatus;
  quality: QualityWarning;
  readonly file?: File;
  readonly previewUrl?: string;
  readonly filename?: string;
  readonly jobId?: string;
};

const THUMB_BG = [
  "#F5F0E8",
  "#EEF0F5",
  "#F0F5EE",
  "#F5EEF0",
  "#EDF3F0",
  "#F3EDF5",
  "#F5F1E8",
  "#EBF0F5",
  "#F0F5EB",
  "#F5EBF0",
  "#E8F3F0",
  "#F0E8F3",
] as const;

export function thumbBg(index: number): string {
  return THUMB_BG[index % THUMB_BG.length] ?? "#F5F0E8";
}

let pageIdSeq = 0;

export function nextCapturePageId(): string {
  pageIdSeq += 1;
  return `cap-${String(pageIdSeq)}-${String(Date.now())}`;
}

/** Reset id sequence (tests only). */
export function resetCapturePageIdSeqForTests(): void {
  pageIdSeq = 0;
}

export function createCapturePageFromFile(
  file: File,
  index: number,
  upload: UploadStatus = "local",
): CapturePageItem {
  const previewUrl =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(file)
      : undefined;
  const page: CapturePageItem = {
    id: nextCapturePageId(),
    n: index + 1,
    bg: thumbBg(index),
    upload,
    quality: null,
    file,
    filename: file.name,
  };
  if (previewUrl) {
    return { ...page, previewUrl };
  }
  return page;
}

export function createCapturePagesFromFiles(
  files: readonly File[],
  startIndex: number,
  upload: UploadStatus = "local",
): CapturePageItem[] {
  return files.map((file, i) =>
    createCapturePageFromFile(file, startIndex + i, upload),
  );
}

export function revokeCapturePreviewUrls(
  pages: readonly CapturePageItem[],
): void {
  for (const page of pages) {
    if (page.previewUrl && typeof URL !== "undefined") {
      URL.revokeObjectURL(page.previewUrl);
    }
  }
}

/** Demo thumbs for mock/preview mode (quality + upload warning coverage). */
export function buildMockDemoPages(): CapturePageItem[] {
  const qualities: QualityWarning[] = [
    null,
    "blurry",
    null,
    null,
    "glare",
    null,
    null,
    "cropped",
    null,
    null,
    null,
    "duplicate",
  ];
  const uploads: UploadStatus[] = [
    "uploaded",
    "uploaded",
    "uploading",
    "failed",
    "uploaded",
    "local",
    "uploaded",
    "local",
    "uploaded",
    "uploaded",
    "uploading",
    "uploaded",
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `mock-demo-${String(i + 1)}`,
    n: i + 1,
    bg: thumbBg(i),
    upload: uploads[i] ?? "local",
    quality: qualities[i] ?? null,
    filename: `demo-page-${String(i + 1)}.jpg`,
  }));
}

export function markPagesUploaded(
  pages: readonly CapturePageItem[],
  ids: readonly string[],
  jobIds: readonly string[],
): CapturePageItem[] {
  const idSet = new Set(ids);
  let jobCursor = 0;
  return pages.map((page) => {
    if (!idSet.has(page.id)) return page;
    const jobId = jobIds[jobCursor];
    jobCursor += 1;
    return {
      ...page,
      upload: "uploaded" as const,
      ...(jobId ? { jobId } : {}),
    };
  });
}

export function markPagesFailed(
  pages: readonly CapturePageItem[],
  ids: readonly string[],
): CapturePageItem[] {
  const idSet = new Set(ids);
  return pages.map((page) =>
    idSet.has(page.id) ? { ...page, upload: "failed" as const } : page,
  );
}
