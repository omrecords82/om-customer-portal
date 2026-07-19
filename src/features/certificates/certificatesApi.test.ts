import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../../auth/config", () => ({
  authMode: "live",
  requireAuth: false,
}));

import { apiFetch } from "../../auth/apiFetch";
import {
  fetchCertificateHistory,
  normalizeCertificateKind,
  recipientFromHistoryRow,
  startCertificateDraft,
  unwrapCertificateHistory,
} from "./certificatesApi";

const mockedApiFetch = vi.mocked(apiFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("normalizeCertificateKind", () => {
  it("maps studio and portal kinds", () => {
    expect(normalizeCertificateKind("baptism")).toBe("baptism");
    expect(normalizeCertificateKind("Marriage")).toBe("marriage");
    expect(normalizeCertificateKind("reception")).toBe("reception");
    expect(normalizeCertificateKind("chrismation")).toBe("chrismation");
    expect(normalizeCertificateKind("unknown")).toBe("baptism");
  });
});

describe("recipientFromHistoryRow", () => {
  it("prefers explicit recipient fields", () => {
    expect(
      recipientFromHistoryRow({ recipient_name: "Anna Kova" }),
    ).toBe("Anna Kova");
  });

  it("builds marriage names from record snapshot", () => {
    expect(
      recipientFromHistoryRow({
        certificate_type: "marriage",
        record_snapshot_json: {
          fname_groom: "George",
          lname_groom: "Ivanov",
          fname_bride: "Maria",
          lname_bride: "Ivanova",
        },
      }),
    ).toBe("George Ivanov & Maria Ivanova");
  });

  it("builds person names and falls back to record id", () => {
    expect(
      recipientFromHistoryRow({
        certificate_type: "baptism",
        record_snapshot_json: JSON.stringify({
          first_name: "Michael",
          last_name: "Petrov",
        }),
      }),
    ).toBe("Michael Petrov");
    expect(recipientFromHistoryRow({ record_id: 42 })).toBe("Record #42");
  });
});

describe("unwrapCertificateHistory", () => {
  it("maps studio history rows", () => {
    const rows = unwrapCertificateHistory({
      history: [
        {
          id: 9,
          certificate_type: "reception",
          generated_at: "2026-07-01T12:00:00Z",
          template_name: "Reception Letter",
          record_id: 77,
          generated_pdf_path: "certs/9.pdf",
          record_snapshot_json: { first_name: "Natalia", last_name: "Sokolova" },
        },
      ],
    });
    expect(rows).toEqual([
      {
        id: "9",
        kind: "reception",
        recipient: "Natalia Sokolova",
        issued: "2026-07-01",
        status: "issued",
        templateName: "Reception Letter",
        recordId: 77,
      },
    ]);
  });

  it("returns empty for malformed payloads", () => {
    expect(unwrapCertificateHistory(null)).toEqual([]);
    expect(unwrapCertificateHistory({ history: "nope" })).toEqual([]);
  });
});

describe("fetchCertificateHistory (live)", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("requires church context", async () => {
    const result = await fetchCertificateHistory(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("loads live history rows", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        history: [
          {
            id: 3,
            certificate_type: "baptism",
            generated_at: "2026-06-14T08:00:00Z",
            template_name: "Baptism",
            record_id: 11,
            generated_pdf_path: "x.pdf",
            recipient_name: "Michael Petrov",
          },
        ],
      }),
    );

    const result = await fetchCertificateHistory(46);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("live");
    expect(result.rows[0]?.recipient).toBe("Michael Petrov");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/certificates/history?church_id=46&limit=50",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("surfaces HTTP errors honestly", async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse({ error: "down" }, 503));
    const result = await fetchCertificateHistory(46);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.message).toContain("503");
    }
  });
});

describe("startCertificateDraft", () => {
  it("rejects empty recipient", () => {
    expect(startCertificateDraft({ recipient: "  " }).ok).toBe(false);
  });

  it("defers live render without inventing template/record ids", () => {
    const result = startCertificateDraft({
      recipient: "Test Person",
      churchId: 46,
    });
    expect(result).toMatchObject({ ok: true, source: "deferred" });
    if (result.ok) {
      expect(result.message).toContain("/api/certificates/render");
    }
  });
});
