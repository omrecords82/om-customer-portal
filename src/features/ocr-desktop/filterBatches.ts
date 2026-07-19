import type { BatchStatus } from "./types";

export type BatchFilterable = {
  readonly id: string;
  readonly name: string;
  readonly recordType: string;
  readonly status: BatchStatus;
};

export function filterBatches<T extends BatchFilterable>(
  batches: readonly T[],
  opts: { readonly query: string; readonly status: BatchStatus | "all" },
): T[] {
  const q = opts.query.trim().toLowerCase();
  return batches.filter((batch) => {
    if (opts.status !== "all" && batch.status !== opts.status) {
      return false;
    }
    if (!q) return true;
    return (
      batch.name.toLowerCase().includes(q) ||
      batch.recordType.toLowerCase().includes(q) ||
      batch.status.toLowerCase().includes(q)
    );
  });
}
