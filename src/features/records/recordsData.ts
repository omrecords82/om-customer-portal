export type RecordType =
  | "baptism"
  | "marriage"
  | "funeral"
  | "chrismation";

export type SacramentalRecord = {
  readonly id: string;
  readonly type: RecordType;
  readonly personName: string;
  readonly date: string;
  readonly clergy: string;
  readonly status: "draft" | "complete" | "needs-review";
};

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  funeral: "Funeral",
  chrismation: "Chrismation",
};

export const MOCK_RECORDS: readonly SacramentalRecord[] = [
  {
    id: "r1",
    type: "baptism",
    personName: "Michael Petrov",
    date: "2026-06-12",
    clergy: "Fr. Michael",
    status: "complete",
  },
  {
    id: "r2",
    type: "marriage",
    personName: "George & Maria Ivanova",
    date: "2026-05-30",
    clergy: "Fr. Michael",
    status: "complete",
  },
  {
    id: "r3",
    type: "chrismation",
    personName: "Natalia Sokolova",
    date: "2026-04-18",
    clergy: "Fr. Nicholas",
    status: "needs-review",
  },
  {
    id: "r4",
    type: "funeral",
    personName: "Ivan Kozlov",
    date: "2026-03-02",
    clergy: "Fr. Michael",
    status: "draft",
  },
  {
    id: "r5",
    type: "baptism",
    personName: "Alexandra Kozlov",
    date: "2026-07-01",
    clergy: "Fr. Nicholas",
    status: "complete",
  },
];

export function filterRecords(
  records: readonly SacramentalRecord[],
  opts: { readonly query: string; readonly type: RecordType | "all" },
): SacramentalRecord[] {
  const q = opts.query.trim().toLowerCase();
  return records.filter((record) => {
    if (opts.type !== "all" && record.type !== opts.type) return false;
    if (!q) return true;
    return (
      record.personName.toLowerCase().includes(q) ||
      record.clergy.toLowerCase().includes(q) ||
      RECORD_TYPE_LABEL[record.type].toLowerCase().includes(q)
    );
  });
}
