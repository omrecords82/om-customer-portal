import { describe, expect, it } from "vitest";

import {
  buildCertificateHistoryNote,
  buildCertificateRecordsNote,
  buildCertificateTemplatesNote,
  buildHistoryEmptyTableCopy,
  classifyRenderStatusMessage,
  historySourceBadgeLabel,
  resolveCertificateHistorySource,
  shouldShowHistoryRefresh,
} from "./certificatesPresentation";

describe("certificatesPresentation", () => {
  it("resolves history source from fetch results", () => {
    expect(
      resolveCertificateHistorySource({
        ok: false,
        fetchSource: "live",
        rowCount: 0,
      }),
    ).toBe("empty");
    expect(
      resolveCertificateHistorySource({
        ok: true,
        fetchSource: "live",
        rowCount: 0,
      }),
    ).toBe("empty");
    expect(
      resolveCertificateHistorySource({
        ok: true,
        fetchSource: "live",
        rowCount: 3,
      }),
    ).toBe("live");
    expect(
      resolveCertificateHistorySource({
        ok: true,
        fetchSource: "mock",
        rowCount: 2,
      }),
    ).toBe("mock");
  });

  it("builds honest history notes", () => {
    expect(
      buildCertificateHistoryNote({
        source: "empty",
        errorMessage: "Church context required.",
      }),
    ).toBe("Church context required.");
    expect(
      buildCertificateHistoryNote({ source: "empty" }),
    ).toMatch(/No certificate history/i);
    expect(
      buildCertificateHistoryNote({ source: "mock" }),
    ).toMatch(/Preview rows/i);
    expect(buildCertificateHistoryNote({ source: "live" })).toBeNull();
  });

  it("builds template and record picker notes", () => {
    expect(
      buildCertificateTemplatesNote({ source: "mock", count: 0 }),
    ).toMatch(/Preview mode/i);
    expect(
      buildCertificateTemplatesNote({ source: "live", count: 0 }),
    ).toMatch(/No active templates/i);
    expect(
      buildCertificateTemplatesNote({ source: "live", count: 2 }),
    ).toBeNull();

    expect(
      buildCertificateRecordsNote({ source: "mock", count: 0 }),
    ).toMatch(/Preview mode/i);
    expect(
      buildCertificateRecordsNote({ source: "live", count: 0 }),
    ).toMatch(/No matching records/i);
  });

  it("classifies render status tone", () => {
    expect(
      classifyRenderStatusMessage("Certificate rendered (completed)."),
    ).toBe("success");
    expect(
      classifyRenderStatusMessage("Required fields missing. Missing: person_name."),
    ).toBe("error");
    expect(classifyRenderStatusMessage("Generating…")).toBe("neutral");
  });

  it("labels history badge and refresh affordance", () => {
    expect(historySourceBadgeLabel("live", false)).toBe("live");
    expect(historySourceBadgeLabel("mock", true)).toBe("Loading…");
    expect(shouldShowHistoryRefresh(true, "live")).toBe(true);
    expect(shouldShowHistoryRefresh(true, "mock")).toBe(false);
    expect(shouldShowHistoryRefresh(false, "live")).toBe(false);
  });

  it("shows empty table copy only for live empty states", () => {
    expect(buildHistoryEmptyTableCopy("empty", false)).toBe(
      "No certificates to show.",
    );
    expect(buildHistoryEmptyTableCopy("mock", false)).toBeNull();
    expect(buildHistoryEmptyTableCopy("empty", true)).toBeNull();
  });
});
