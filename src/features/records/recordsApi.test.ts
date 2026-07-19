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
  buildRecordsListUrl,
  fetchSacramentalRecordsList,
  mapRecordStatus,
  mapRowToSacramentalRecord,
  personNameFromRow,
  unwrapRecordsListPayload,
} from "./recordsApi";

const mockedApiFetch = vi.mocked(apiFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("unwrapRecordsListPayload", () => {
  it("unwraps records array and pagination meta", () => {
    const result = unwrapRecordsListPayload({
      records: [{ id: 1 }],
      totalRecords: 42,
      currentPage: 2,
      totalPages: 5,
    });
    expect(result?.rows).toHaveLength(1);
    expect(result?.meta).toEqual({
      totalRecords: 42,
      currentPage: 2,
      totalPages: 5,
    });
  });
});

describe("mapRowToSacramentalRecord", () => {
  it("maps baptism row fields", () => {
    const row = mapRowToSacramentalRecord(
      {
        id: 9,
        first_name: "Michael",
        last_name: "Petrov",
        reception_date: "2026-06-12",
        clergy: "Fr. Michael",
        status: "Recorded",
      },
      "baptism",
    );
    expect(row).toEqual({
      id: "baptism:9",
      type: "baptism",
      personName: "Michael Petrov",
      date: "2026-06-12",
      clergy: "Fr. Michael",
      status: "complete",
    });
  });

  it("maps marriage pair label", () => {
    expect(
      personNameFromRow(
        {
          fname_groom: "George",
          lname_groom: "Ivanov",
          fname_bride: "Maria",
          lname_bride: "Ivanova",
        },
        "marriage",
      ),
    ).toBe("George Ivanov & Maria Ivanova");
  });

  it("maps status variants", () => {
    expect(mapRecordStatus("Draft")).toBe("draft");
    expect(mapRecordStatus("needs review")).toBe("needs-review");
    expect(mapRecordStatus("Recorded")).toBe("complete");
  });
});

describe("fetchSacramentalRecordsList (live)", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("loads baptism records with church_id and search", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        records: [{ id: 11, first_name: "A", last_name: "B", reception_date: "2026-01-01" }],
        totalRecords: 1,
        currentPage: 1,
        totalPages: 1,
      }),
    );
    const result = await fetchSacramentalRecordsList({
      churchId: 46,
      typeFilter: "baptism",
      search: "A",
      page: 1,
      limit: 25,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("live");
    expect(result.records[0]?.personName).toBe("A B");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/baptism-records?"),
      expect.objectContaining({ method: "GET" }),
    );
    const url = mockedApiFetch.mock.calls[0]?.[0];
    expect(String(url)).toContain("church_id=46");
    expect(String(url)).toContain("search=A");
  });

  it("returns honest empty for chrismation filter", async () => {
    const result = await fetchSacramentalRecordsList({
      churchId: 46,
      typeFilter: "chrismation",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(0);
    expect(result.note).toMatch(/Chrismation/i);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("merges all-types results from three endpoints", async () => {
    mockedApiFetch
      .mockResolvedValueOnce(
        jsonResponse({
          records: [{ id: 1, first_name: "B", last_name: "One", reception_date: "2026-01-01" }],
          totalRecords: 1,
          currentPage: 1,
          totalPages: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          records: [
            {
              id: 2,
              fname_groom: "G",
              lname_groom: "Groom",
              fname_bride: "B",
              lname_bride: "Bride",
              mdate: "2026-02-01",
            },
          ],
          totalRecords: 1,
          currentPage: 1,
          totalPages: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          records: [{ id: 3, name: "Ivan", lastname: "Kozlov", burial_date: "2026-03-01" }],
          totalRecords: 1,
          currentPage: 1,
          totalPages: 1,
        }),
      );

    const result = await fetchSacramentalRecordsList({
      churchId: 46,
      typeFilter: "all",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(3);
    expect(result.meta.totalRecords).toBe(3);
    expect(result.note).toMatch(/type filter/i);
    expect(mockedApiFetch).toHaveBeenCalledTimes(3);
  });

  it("requires church context in live mode", async () => {
    const result = await fetchSacramentalRecordsList({
      churchId: null,
      typeFilter: "baptism",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/Church context/i);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("rejects non-positive churchId without calling API", async () => {
    for (const churchId of [0, -3]) {
      mockedApiFetch.mockReset();
      const result = await fetchSacramentalRecordsList({
        churchId,
        typeFilter: "marriage",
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(400);
      expect(mockedApiFetch).not.toHaveBeenCalled();
    }
  });

  it("scopes marriage and funeral list URLs to the same church_id", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({ records: [], totalRecords: 0, currentPage: 1, totalPages: 1 }),
    );
    await fetchSacramentalRecordsList({
      churchId: 12,
      typeFilter: "marriage",
      page: 2,
      limit: 50,
    });
    const marriageUrl = String(mockedApiFetch.mock.calls[0]?.[0]);
    expect(marriageUrl).toContain("/api/marriage-records?");
    expect(marriageUrl).toContain("church_id=12");
    expect(marriageUrl).not.toContain("churchId=");

    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(
      jsonResponse({ records: [], totalRecords: 0, currentPage: 1, totalPages: 1 }),
    );
    await fetchSacramentalRecordsList({
      churchId: 12,
      typeFilter: "funeral",
    });
    const funeralUrl = String(mockedApiFetch.mock.calls[0]?.[0]);
    expect(funeralUrl).toContain("/api/funeral-records?");
    expect(funeralUrl).toContain("church_id=12");
  });

  it("uses one church_id for all three endpoints in combined view", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({ records: [], totalRecords: 0, currentPage: 1, totalPages: 1 }),
    );
    await fetchSacramentalRecordsList({
      churchId: 99,
      typeFilter: "all",
    });
    expect(mockedApiFetch).toHaveBeenCalledTimes(3);
    for (const call of mockedApiFetch.mock.calls) {
      const url = call[0];
      expect(url).toContain("church_id=99");
      expect(url).not.toMatch(/church_id=0(?:&|$)/);
      expect(url).not.toContain("tenant_id=");
      expect(url).not.toContain("churchId=");
    }
  });
});

describe("buildRecordsListUrl (tenant isolation)", () => {
  it("always includes church_id and omits cross-tenant override params", () => {
    const url = buildRecordsListUrl("baptism", {
      churchId: 7,
      page: 3,
      limit: 25,
      search: "Smith",
    });
    expect(url).toBe(
      "/api/baptism-records?church_id=7&page=3&limit=25&sortField=id&sortDirection=desc&search=Smith",
    );
    expect(url).not.toContain("churchId=");
    expect(url).not.toContain("tenant");
  });

  it("returns null for chrismation (no list API)", () => {
    expect(
      buildRecordsListUrl("chrismation", {
        churchId: 7,
        page: 1,
        limit: 25,
        search: "",
      }),
    ).toBeNull();
  });

  it("does not embed arbitrary church ids from deep links — caller must pass session church", () => {
    const sessionChurch = 5;
    const deepLinkChurch = 999;
    const url = buildRecordsListUrl("baptism", {
      churchId: sessionChurch,
      page: 1,
      limit: 25,
      search: "",
    });
    expect(url).toContain("church_id=5");
    expect(url).not.toContain(String(deepLinkChurch));
  });
});
