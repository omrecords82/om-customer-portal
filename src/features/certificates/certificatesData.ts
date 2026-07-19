export type CertificateRow = {
  readonly id: string;
  readonly kind: "baptism" | "marriage" | "chrismation";
  readonly recipient: string;
  readonly issued: string;
  readonly status: "issued" | "draft" | "void";
};

export const MOCK_CERTIFICATES: readonly CertificateRow[] = [
  {
    id: "c1",
    kind: "baptism",
    recipient: "Michael Petrov",
    issued: "2026-06-14",
    status: "issued",
  },
  {
    id: "c2",
    kind: "marriage",
    recipient: "George & Maria Ivanova",
    issued: "2026-06-01",
    status: "issued",
  },
  {
    id: "c3",
    kind: "chrismation",
    recipient: "Natalia Sokolova",
    issued: "2026-04-20",
    status: "draft",
  },
];
