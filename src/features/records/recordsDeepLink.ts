import type { RecordType } from "./recordsData";

/**
 * Legacy `/portal/records?type=` contract — preserve for bookmarks and external links.
 * Unknown values fall back to `all` (never 404).
 */
export type RecordsTypeFilter = RecordType | "all";

/** Historical / alternate type strings seen in links → canonical RecordType. */
const TYPE_ALIASES: Readonly<Record<string, RecordType>> = {
  baptism: "baptism",
  baptisms: "baptism",
  baptismal: "baptism",
  b: "baptism",
  marriage: "marriage",
  marriages: "marriage",
  wedding: "marriage",
  weddings: "marriage",
  m: "marriage",
  funeral: "funeral",
  funerals: "funeral",
  burial: "funeral",
  burials: "funeral",
  f: "funeral",
  chrismation: "chrismation",
  chrismations: "chrismation",
  confirmation: "chrismation",
  c: "chrismation",
};

export function normalizeRecordsTypeParam(
  raw: string | null | undefined,
): RecordsTypeFilter {
  if (!raw?.trim()) return "all";
  const key = raw.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? "all";
}

export type ParsedRecordsDeepLink = {
  readonly typeFilter: RecordsTypeFilter;
  /** Canonical type string for URL rewriting when an alias was used */
  readonly canonicalType: string | null;
  readonly recordId: string | null;
  readonly churchId: number | null;
  /** Other query keys preserved for compatibility */
  readonly extras: Readonly<Record<string, string>>;
};

const RESERVED = new Set(["type", "recordId", "churchId"]);

export function parseRecordsDeepLink(searchParams: URLSearchParams): ParsedRecordsDeepLink {
  const typeRaw = searchParams.get("type");
  const typeFilter = normalizeRecordsTypeParam(typeRaw);
  const canonicalType = typeFilter === "all" ? null : typeFilter;

  const recordIdRaw = searchParams.get("recordId");
  const recordId =
    recordIdRaw && /^\d+$/.test(recordIdRaw) ? recordIdRaw : null;

  const churchIdRaw = searchParams.get("churchId");
  const churchId =
    churchIdRaw && /^\d+$/.test(churchIdRaw) ? Number(churchIdRaw) : null;

  const extras: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (!RESERVED.has(key)) extras[key] = value;
  });

  return { typeFilter, canonicalType, recordId, churchId, extras };
}

/** Build records search string, normalizing type aliases and preserving extras. */
export function buildRecordsSearch(opts: {
  readonly typeFilter: RecordsTypeFilter;
  readonly recordId?: string | null;
  readonly churchId?: number | null;
  readonly extras?: Readonly<Record<string, string>>;
}): string {
  const params = new URLSearchParams();
  if (opts.typeFilter !== "all") {
    params.set("type", opts.typeFilter);
  }
  if (opts.recordId) params.set("recordId", opts.recordId);
  if (opts.churchId != null && opts.churchId > 0) {
    params.set("churchId", String(opts.churchId));
  }
  if (opts.extras) {
    for (const [key, value] of Object.entries(opts.extras)) {
      if (!RESERVED.has(key) && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
