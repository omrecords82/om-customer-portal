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
  buildRenderCertificateBody,
  fetchCertificateHistory,
  fetchCertificateRecords,
  fetchCertificateTemplates,
  normalizeCertificateKind,
  normalizeCertificateStudioType,
  parseRenderCertificateResponse,
  recipientFromHistoryRow,
  recordLabelFromRow,
  renderCertificate,
  unwrapCertificateHistory,
  unwrapCertificateRecords,
  unwrapCertificateTemplates,
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

describe("normalizeCertificateStudioType", () => {
  it("maps to studio generate types", () => {
    expect(normalizeCertificateStudioType("marriage")).toBe("marriage");
    expect(normalizeCertificateStudioType("Reception")).toBe("reception");
    expect(normalizeCertificateStudioType("chrismation")).toBe("baptism");
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

describe("unwrapCertificateTemplates", () => {
  it("maps active template rows", () => {
    const templates = unwrapCertificateTemplates({
      templates: [
        {
          id: 12,
          name: "Baptism — Letter",
          certificate_type: "baptism",
          status: "active",
          is_default: 1,
          scope_label: "parish",
        },
      ],
    });
    expect(templates).toEqual([
      {
        id: 12,
        name: "Baptism — Letter",
        certificateType: "baptism",
        status: "active",
        isDefault: true,
        scopeLabel: "parish",
      },
    ]);
  });

  it("skips rows without ids", () => {
    expect(unwrapCertificateTemplates({ templates: [{ name: "x" }] })).toEqual(
      [],
    );
  });
});

describe("recordLabelFromRow / unwrapCertificateRecords", () => {
  it("labels baptism and marriage records", () => {
    expect(
      recordLabelFromRow(
        { id: 1, first_name: "Michael", last_name: "Petrov" },
        "baptism",
      ),
    ).toBe("Michael Petrov");
    expect(
      recordLabelFromRow(
        {
          id: 2,
          fname_groom: "George",
          lname_groom: "Ivanov",
          fname_bride: "Maria",
          lname_bride: "Ivanova",
        },
        "marriage",
      ),
    ).toBe("George Ivanov & Maria Ivanova");
  });

  it("unwraps records list", () => {
    const records = unwrapCertificateRecords(
      {
        records: [
          {
            id: 11,
            first_name: "Natalia",
            last_name: "Sokolova",
            date_of_baptism: "2020-01-15",
          },
        ],
      },
      "baptism",
    );
    expect(records[0]?.id).toBe(11);
    expect(records[0]?.label).toBe("Natalia Sokolova");
    expect(records[0]?.dateLabel).toBeTruthy();
  });
});

describe("buildRenderCertificateBody", () => {
  it("requires template_id, record_id, and church_id", () => {
    expect(
      buildRenderCertificateBody({
        templateId: "",
        recordId: 5,
        certificateType: "baptism",
        churchId: 46,
      }),
    ).toBeNull();
    expect(
      buildRenderCertificateBody({
        templateId: 3,
        recordId: 5,
        certificateType: "baptism",
        churchId: null,
      }),
    ).toBeNull();
  });

  it("builds studio render payload", () => {
    expect(
      buildRenderCertificateBody({
        templateId: "7",
        recordId: 99,
        certificateType: "marriage",
        churchId: 46,
        force: true,
      }),
    ).toEqual({
      template_id: 7,
      record_id: 99,
      certificate_type: "marriage",
      church_id: 46,
      force: true,
    });
  });
});

describe("parseRenderCertificateResponse", () => {
  it("parses history_id and download_url", () => {
    expect(
      parseRenderCertificateResponse({
        job_id: 4,
        history_id: 88,
        status: "completed",
        download_url: "/api/certificates/history/88/download",
      }),
    ).toEqual({
      jobId: 4,
      historyId: 88,
      status: "completed",
      downloadUrl: "/api/certificates/history/88/download",
    });
  });

  it("derives download url from history_id when omitted", () => {
    const parsed = parseRenderCertificateResponse({ history_id: 5 });
    expect(parsed?.downloadUrl).toBe(
      "/api/certificates/history/5/download",
    );
  });

  it("rejects empty payloads", () => {
    expect(parseRenderCertificateResponse(null)).toBeNull();
    expect(parseRenderCertificateResponse({ status: "ok" })).toBeNull();
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

describe("fetchCertificateTemplates / fetchCertificateRecords (live)", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("loads templates with church and type filters", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        templates: [
          {
            id: 2,
            name: "Baptism",
            certificate_type: "baptism",
            status: "active",
            is_default: true,
          },
        ],
      }),
    );
    const result = await fetchCertificateTemplates({
      churchId: 46,
      certificateType: "baptism",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("live");
    expect(result.templates[0]?.id).toBe(2);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/certificates/templates?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("loads records list", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        records: [{ id: 11, first_name: "A", last_name: "B" }],
      }),
    );
    const result = await fetchCertificateRecords({
      churchId: 46,
      certificateType: "baptism",
      search: "A",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records[0]?.label).toBe("A B");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/certificates/records/baptism?"),
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("renderCertificate (live)", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("posts render body and parses success", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        job_id: 1,
        history_id: 44,
        status: "completed",
        download_url: "/api/certificates/history/44/download",
      }),
    );
    const result = await renderCertificate({
      templateId: 7,
      recordId: 11,
      certificateType: "baptism",
      churchId: 46,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.historyId).toBe(44);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/certificates/render",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          template_id: 7,
          record_id: 11,
          certificate_type: "baptism",
          church_id: 46,
        }),
      }),
    );
  });

  it("surfaces missing_fields on 422", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse(
        {
          error: "Required fields missing",
          missing_fields: ["person_name"],
        },
        422,
      ),
    );
    const result = await renderCertificate({
      templateId: 7,
      recordId: 11,
      certificateType: "baptism",
      churchId: 46,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect(result.missingFields).toEqual(["person_name"]);
  });

  it("rejects without template/record/church", async () => {
    const result = await renderCertificate({
      templateId: "",
      recordId: 11,
      certificateType: "baptism",
      churchId: 46,
    });
    expect(result.ok).toBe(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
