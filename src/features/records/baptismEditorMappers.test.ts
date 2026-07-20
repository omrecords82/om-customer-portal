import { describe, expect, it } from "vitest";

import {
  baptismRowToFormState,
  formStateToCreatePayload,
  formStateToUpdatePayload,
  normalizeBaptismStatus,
  normalizeDateInput,
  parseBaptismRecordId,
  parseBaptismRowFromApi,
  todayIsoDate,
  validateBaptismFormForCreate,
  validateBaptismFormForUpdate,
} from "./baptismEditorMappers";

describe("baptismEditorMappers", () => {
  it("normalizes date strings for HTML date inputs", () => {
    expect(normalizeDateInput("2020-01-15T00:00:00.000Z")).toBe("2020-01-15");
    expect(normalizeDateInput(null)).toBe("");
    expect(normalizeDateInput("")).toBe("");
  });

  it("maps API row to form state", () => {
    const form = baptismRowToFormState({
      id: 9,
      church_id: 46,
      first_name: "Anna",
      last_name: "Smith",
      birth_date: "2019-05-01",
      reception_date: "2019-06-01",
      birthplace: "St. Nicholas Church",
      entry_type: "Chrismation",
      sponsors: "John & Mary",
      parents: "George Smith",
      clergy: "Fr. James",
      status: "Recorded",
    });
    expect(form.first_name).toBe("Anna");
    expect(form.birth_date).toBe("2019-05-01");
    expect(form.entry_type).toBe("Chrismation");
    expect(form.clergy).toBe("Fr. James");
  });

  it("parses legacy OM rows with active status and empty last_name/clergy", () => {
    const row = parseBaptismRowFromApi({
      id: 607,
      churchId: "46",
      firstName: "Stanislaus",
      lastName: "",
      priest: "",
      status: "active",
      entryType: "Baptism",
    });
    expect(row?.id).toBe(607);
    expect(row?.church_id).toBe(46);
    expect(row?.first_name).toBe("Stanislaus");
    expect(row?.last_name).toBe("");
    expect(row?.clergy).toBe("");
    expect(row?.status).toBe("Recorded");
    expect(normalizeBaptismStatus("active")).toBe("Recorded");
  });

  it("rejects future birth and reception dates on save", () => {
    const farFuture = `${String(Number(todayIsoDate().slice(0, 4)) + 1000)}-05-04`;
    expect(
      validateBaptismFormForCreate({
        first_name: "James",
        last_name: "Presti",
        birth_date: farFuture,
        reception_date: "",
        birthplace: "",
        entry_type: "Baptism",
        sponsors: "",
        parents: "",
        clergy: "Fr. James",
      }).ok,
    ).toBe(false);
    expect(
      validateBaptismFormForUpdate({
        first_name: "James",
        last_name: "Presti",
        birth_date: "",
        reception_date: farFuture,
        birthplace: "",
        entry_type: "Baptism",
        sponsors: "",
        parents: "",
        clergy: "Fr. James",
      }).ok,
    ).toBe(false);
    const futureUpdate = validateBaptismFormForUpdate({
      first_name: "James",
      last_name: "Presti",
      birth_date: "",
      reception_date: farFuture,
      birthplace: "",
      entry_type: "Baptism",
      sponsors: "",
      parents: "",
      clergy: "Fr. James",
    });
    expect(futureUpdate.ok).toBe(false);
    if (!futureUpdate.ok) {
      expect(futureUpdate.message).toMatch(/cannot be in the future/i);
    }
  });

  it("rejects invalid entry type values", () => {
    const invalidEntry = validateBaptismFormForUpdate({
      first_name: "Anna",
      last_name: "Smith",
      birth_date: "",
      reception_date: "",
      birthplace: "",
      entry_type: "Infant",
      sponsors: "",
      parents: "",
      clergy: "Fr. James",
    });
    expect(invalidEntry.ok).toBe(false);
    if (!invalidEntry.ok) {
      expect(invalidEntry.message).toMatch(/Baptism or Chrismation/i);
    }
  });

  it("builds create payload with session church_id via contracts parser", () => {
    const payload = formStateToCreatePayload(
      {
        first_name: "Anna",
        last_name: "Smith",
        birth_date: "2019-05-01",
        reception_date: "",
        birthplace: "",
        entry_type: "",
        sponsors: "",
        parents: "",
        clergy: "Fr. James",
      },
      46,
    );
    expect(payload.church_id).toBe(46);
    expect(payload.first_name).toBe("Anna");
    expect(payload.birth_date).toBe("2019-05-01");
    expect(payload.reception_date).toBeFalsy();
  });

  it("builds update payload allowing optional birth_date", () => {
    const payload = formStateToUpdatePayload(
      {
        first_name: "Anna",
        last_name: "Smith",
        birth_date: "",
        reception_date: "2019-06-01",
        birthplace: "Church",
        entry_type: "",
        sponsors: "",
        parents: "",
        clergy: "Fr. James",
      },
      46,
    );
    expect(payload.church_id).toBe(46);
    expect(payload.birth_date).toBeFalsy();
    expect(payload.reception_date).toBe("2019-06-01");
  });

  it("validates required create fields", () => {
    expect(
      validateBaptismFormForCreate({
        first_name: "",
        last_name: "Smith",
        birth_date: "2019-05-01",
        reception_date: "",
        birthplace: "",
        entry_type: "",
        sponsors: "",
        parents: "",
        clergy: "Fr. James",
      }).ok,
    ).toBe(false);

    expect(
      validateBaptismFormForCreate({
        first_name: "Anna",
        last_name: "Smith",
        birth_date: "2019-05-01",
        reception_date: "",
        birthplace: "",
        entry_type: "",
        sponsors: "",
        parents: "",
        clergy: "Fr. James",
      }).ok,
    ).toBe(true);
  });

  it("validates update fields", () => {
    expect(
      validateBaptismFormForUpdate({
        first_name: "Anna",
        last_name: "Smith",
        birth_date: "",
        reception_date: "",
        birthplace: "",
        entry_type: "",
        sponsors: "",
        parents: "",
        clergy: "",
      }).ok,
    ).toBe(false);
  });

  it("parses list and deep-link record ids", () => {
    expect(parseBaptismRecordId("baptism:42")).toBe(42);
    expect(parseBaptismRecordId("42")).toBe(42);
    expect(parseBaptismRecordId("marriage:9")).toBeNull();
    expect(parseBaptismRecordId(null)).toBeNull();
  });
});
