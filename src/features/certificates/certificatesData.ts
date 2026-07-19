export type CertificateKind =
  | "baptism"
  | "marriage"
  | "chrismation"
  | "reception";

export type CertificateRow = {
  readonly id: string;
  readonly kind: CertificateKind;
  readonly recipient: string;
  readonly issued: string;
  readonly status: "issued" | "draft" | "void";
  /** Present on live history rows when a template name is returned. */
  readonly templateName?: string;
  /** Sacramental record id from Certificate Studio history. */
  readonly recordId?: number;
};

export const MOCK_CERTIFICATES: readonly CertificateRow[] = [
  {
    id: "c1",
    kind: "baptism",
    recipient: "Michael Petrov",
    issued: "2026-06-14",
    status: "issued",
    templateName: "Baptism — Letter",
  },
  {
    id: "c2",
    kind: "marriage",
    recipient: "George & Maria Ivanova",
    issued: "2026-06-01",
    status: "issued",
    templateName: "Marriage — Landscape",
  },
  {
    id: "c3",
    kind: "chrismation",
    recipient: "Natalia Sokolova",
    issued: "2026-04-20",
    status: "draft",
    templateName: "Reception draft",
  },
];
