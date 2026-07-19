export type ProcessingMode = "standard" | "autoseed";

export type BatchStatus =
  | "draft"
  | "uploading"
  | "processing"
  | "ready-for-review"
  | "completed"
  | "failed";

export type Batch = {
  readonly id: string;
  readonly name: string;
  readonly recordType: string;
  readonly submitted: string;
  readonly pages: number;
  readonly records: number;
  readonly mode: ProcessingMode;
  readonly status: BatchStatus;
  readonly needsReview: number;
};
