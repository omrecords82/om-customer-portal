/** Presentation helpers for baptism editor history panel. */

export type BaptismHistoryEntry = {
  readonly id: number;
  readonly type: string;
  readonly description: string;
  readonly timestamp: string;
  readonly actor: string | null;
  readonly source: string | null;
  readonly changedFields: readonly string[];
};

export function formatHistoryTypeLabel(type: string): string {
  const normalized = type.trim().toLowerCase();
  switch (normalized) {
    case "create":
      return "Created";
    case "update":
      return "Updated";
    case "delete":
      return "Deleted";
    case "merge":
      return "Merged";
    case "restore":
      return "Restored";
    default:
      return type.trim() || "Event";
  }
}

export function formatHistoryTimestamp(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

export function buildHistoryEmptyCopy(loading: boolean, recordId: number | null): string {
  if (loading) return "Loading audit history…";
  if (recordId == null) return "Save the record to view audit history.";
  return "No audit history entries yet for this baptism record.";
}

export function buildHistoryErrorCopy(message: string): string {
  return message.trim() || "Could not load audit history.";
}
