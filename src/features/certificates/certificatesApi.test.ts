import { describe, expect, it } from "vitest";

import {
  fetchCertificateHistory,
  startCertificateDraft,
} from "./certificatesApi";

describe("certificatesApi seam stubs", () => {
  it("returns mock rows when auth is not live", async () => {
    const result = await fetchCertificateHistory(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("mock");
      expect(result.rows.length).toBeGreaterThan(0);
    }
  });

  it("starts a mock draft without live auth", () => {
    const result = startCertificateDraft({ recipient: "Test Person" });
    expect(result).toMatchObject({ ok: true, source: "mock" });
  });

  it("rejects empty recipient", () => {
    const result = startCertificateDraft({ recipient: "  " });
    expect(result.ok).toBe(false);
  });
});
