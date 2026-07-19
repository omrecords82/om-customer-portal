/**
 * Wave F certificates presentation helpers — testable copy and status classification.
 */

export type CertificateHistorySource = "mock" | "live" | "empty";

export type CertificateListSource = "mock" | "live";

export function resolveCertificateHistorySource(input: {
  readonly ok: boolean;
  readonly fetchSource: "mock" | "live";
  readonly rowCount: number;
}): CertificateHistorySource {
  if (!input.ok) return "empty";
  if (input.fetchSource === "live") {
    return input.rowCount === 0 ? "empty" : "live";
  }
  return "mock";
}

export function buildCertificateHistoryNote(input: {
  readonly source: CertificateHistorySource;
  readonly errorMessage?: string | null;
}): string | null {
  if (input.source === "empty") {
    return (
      input.errorMessage?.trim() ??
      "No certificate history for this church yet."
    );
  }
  if (input.source === "mock") {
    return "Preview rows (mock). Live history uses GET /api/certificates/history when AUTH_MODE=live and church context is present.";
  }
  return null;
}

export function buildCertificateTemplatesNote(input: {
  readonly source: CertificateListSource;
  readonly count: number;
}): string | null {
  if (input.source === "mock") {
    return "Preview mode: template list is empty. Enter a template id manually, or switch AUTH_MODE=live with church context.";
  }
  if (input.count === 0) {
    return "No active templates for this type. Enter a template id, or create one in Certificate Studio.";
  }
  return null;
}

export function buildCertificateRecordsNote(input: {
  readonly source: CertificateListSource;
  readonly count: number;
}): string | null {
  if (input.source === "mock") {
    return "Preview mode: record list is empty. Enter a record id manually, or switch AUTH_MODE=live with church context.";
  }
  if (input.count === 0) {
    return "No matching records. Adjust search or enter a record id.";
  }
  return null;
}

export type RenderStatusTone = "error" | "success" | "neutral";

/** Classify generate/render status copy for alert styling. */
export function classifyRenderStatusMessage(
  message: string | null | undefined,
): RenderStatusTone {
  if (!message?.trim()) return "neutral";
  const lower = message.toLowerCase();
  if (
    lower.includes("rendered") ||
    lower.includes("completed") ||
    lower.includes("history #")
  ) {
    return "success";
  }
  if (
    lower.includes("missing") ||
    lower.includes("failed") ||
    lower.includes("unavailable") ||
    lower.includes("error") ||
    lower.includes("requires") ||
    lower.includes("deferred")
  ) {
    return "error";
  }
  return "neutral";
}

export function historySourceBadgeLabel(
  source: CertificateHistorySource,
  loading: boolean,
): string {
  if (loading) return "Loading…";
  if (source === "live") return "live";
  if (source === "empty") return "empty";
  return "mock";
}

export function shouldShowHistoryRefresh(
  liveAuth: boolean,
  source: CertificateHistorySource,
): boolean {
  return liveAuth && source !== "mock";
}

export function buildHistoryEmptyTableCopy(
  source: CertificateHistorySource,
  loading: boolean,
): string | null {
  if (loading || source === "mock") return null;
  return "No certificates to show.";
}
