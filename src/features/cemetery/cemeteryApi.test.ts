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
  fetchCemeteryPlots,
  searchDeceasedPeople,
  unwrapCemeteryPeople,
  unwrapCemeteryPlots,
} from "./cemeteryApi";

const mockedApiFetch = vi.mocked(apiFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("cemeteryApi", () => {
  afterEach(() => {
    mockedApiFetch.mockReset();
  });

  it("unwraps plot rows from live payload", () => {
    const rows = unwrapCemeteryPlots({
      success: true,
      data: [
        {
          id: 7,
          sectionCode: "A",
          plotNumber: "12",
          status: "Occupied",
          occupants: "Anna Kozlov",
          rowNo: "1",
        },
      ],
    });
    expect(rows).toEqual([
      {
        id: "7",
        section: "A",
        lot: "12",
        status: "occupied",
        name: "Anna Kozlov",
        rowNo: "1",
      },
    ]);
  });

  it("unwraps people search hits", () => {
    const people = unwrapCemeteryPeople({
      success: true,
      data: [
        {
          personId: 3,
          firstName: "Ivan",
          lastName: "Petrov",
          deathDate: "2019-04-01",
          plotId: 9,
          plotNumber: "3",
          sectionCode: "B",
        },
      ],
    });
    expect(people[0]).toMatchObject({
      personId: "3",
      name: "Ivan Petrov",
      plotNumber: "3",
      sectionCode: "B",
    });
  });

  it("loads live plots for a church", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            id: 1,
            sectionCode: "C",
            plotNumber: "5",
            status: "available",
            occupants: null,
          },
        ],
      }),
    );
    const result = await fetchCemeteryPlots(46);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("live");
    expect(result.plots[0]?.lot).toBe("5");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/churches/46/cemetery/plots",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("searches deceased people live", async () => {
    mockedApiFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            personId: 2,
            firstName: "Maria",
            lastName: "Kozlov",
            plotId: 1,
            plotNumber: "12",
            sectionCode: "A",
          },
        ],
      }),
    );
    const result = await searchDeceasedPeople(46, "Koz");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.people[0]?.name).toBe("Maria Kozlov");
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/churches/46/cemetery/people/search?q=Koz",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects invalid church id for live plots", async () => {
    const result = await fetchCemeteryPlots(0);
    expect(result.ok).toBe(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("surfaces HTTP errors honestly", async () => {
    mockedApiFetch.mockResolvedValue(jsonResponse({ error: "nope" }, 503));
    const result = await fetchCemeteryPlots(46);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(503);
  });
});
