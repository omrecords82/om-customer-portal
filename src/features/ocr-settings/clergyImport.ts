/**
 * Client-side clergy import parsers for CSV and JSON files.
 * Excel (.xlsx) is not parsed in-browser — use CSV/JSON or paste/OCR tabs.
 */

export type ClergyImportRow = {
  canonical_value: string;
  role: string | null;
  active_from: string | null;
  active_to: string | null;
  variants_json: string[];
  source_notes: string | null;
  warnings?: string[];
  selected?: boolean;
};

export const CLERGY_CSV_TEMPLATE =
  "canonical_value,role,active_from,active_to,variants,source_notes\nFr. John Smith,Rector,2010-01-01,,Fr. John,Parish roster";

export const CLERGY_JSON_TEMPLATE = JSON.stringify(
  [
    {
      canonical_value: "Fr. John Smith",
      role: "Rector",
      active_from: "2010-01-01",
      active_to: null,
      variants_json: ["Fr. John"],
      source_notes: "Parish roster",
    },
  ],
  null,
  2,
);

const HEADER_ALIASES: Record<string, string[]> = {
  canonical_value: ["canonical_value", "canonical name", "name", "clergy", "priest", "full name", "clergy name"],
  role: ["role", "title", "position"],
  active_from: ["active_from", "start", "start date", "from", "active from", "service start"],
  active_to: ["active_to", "end", "end date", "to", "active to", "service end"],
  variants_json: ["variants", "variants_json", "spelling variants", "ocr variants", "aliases"],
  source_notes: ["source_notes", "notes", "source", "comments", "remarks"],
};

function normalizeHeader(h: string): string | null {
  const key = h.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

function parseVariants(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      } catch {
        /* fall through */
      }
    }
    return trimmed.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeDateValue(val: unknown): string | null {
  if (val == null || val === "") return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return s;
}

export function normalizeClergyRow(raw: Record<string, unknown>, defaultRole = "Rector"): ClergyImportRow | null {
  const canonical = String(raw.canonical_value || raw.name || raw.clergy || raw.priest || "").trim();
  if (!canonical) return null;

  return {
    canonical_value: canonical,
    role: String(raw.role || defaultRole).trim() || defaultRole,
    active_from: normalizeDateValue(raw.active_from ?? raw.start ?? raw.from),
    active_to: normalizeDateValue(raw.active_to ?? raw.end ?? raw.to),
    variants_json: parseVariants(raw.variants_json ?? raw.variants),
    source_notes: raw.source_notes != null ? String(raw.source_notes).trim() || null : null,
    selected: true,
  };
}

function mapRowCells(headers: string[], cells: string[], defaultRole: string): ClergyImportRow | null {
  const mapped: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    const field = normalizeHeader(h);
    if (field) mapped[field] = cells[i] ?? "";
  });
  return normalizeClergyRow(mapped, defaultRole);
}

function parseDelimitedText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];

  const sample = lines.slice(0, Math.min(5, lines.length)).join("\n");
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  let delimiter = ",";
  if (tabCount > commaCount && tabCount > semicolonCount) delimiter = "\t";
  else if (semicolonCount > commaCount) delimiter = ";";

  const rows: string[][] = [];
  for (const line of lines) {
    const parsedRow: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        parsedRow.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    parsedRow.push(current.trim());
    rows.push(parsedRow);
  }
  return rows;
}

export async function parseClergyFile(
  file: File,
  firstRowIsHeader: boolean,
  defaultRole: string,
): Promise<ClergyImportRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xls") {
    throw new Error("Excel files are not parsed in Portal2 — save as CSV or use Paste text / OCR image.");
  }

  const text = await file.text();
  if (ext === "json") {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) throw new Error("JSON file must contain an array of clergy records.");
    return parsed
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => normalizeClergyRow(row, defaultRole))
      .filter((row): row is ClergyImportRow => row != null);
  }

  const grid = parseDelimitedText(text);
  if (!grid.length) return [];

  let headers = grid[0] ?? [];
  let dataRows = grid;
  if (firstRowIsHeader) {
    dataRows = grid.slice(1);
  } else {
    headers = ["canonical_value", "role", "active_from", "active_to", "variants_json", "source_notes"];
  }

  return dataRows
    .map((cells) => mapRowCells(headers, cells, defaultRole))
    .filter((row): row is ClergyImportRow => row != null);
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
