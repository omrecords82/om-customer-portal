import {
  parseBaptismRecordCreate,
  parseBaptismRecordRow,
  parseBaptismRecordUpdate,
  type BaptismRecordCreate,
  type BaptismRecordRow,
  type BaptismRecordUpdate,
} from "@om/contracts";

/** Portal baptism editor form — string fields for controlled inputs. */
export type BaptismFormState = {
  readonly first_name: string;
  readonly last_name: string;
  readonly birth_date: string;
  readonly reception_date: string;
  readonly birthplace: string;
  readonly entry_type: string;
  readonly sponsors: string;
  readonly parents: string;
  readonly clergy: string;
};

export const EMPTY_BAPTISM_FORM: BaptismFormState = {
  first_name: "",
  last_name: "",
  birth_date: "",
  reception_date: "",
  birthplace: "",
  entry_type: "",
  sponsors: "",
  parents: "",
  clergy: "",
};

function trimOrEmpty(value: string): string {
  return value.trim();
}

function optionalField(value: string): string | null | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Normalize API / ISO date strings to `YYYY-MM-DD` for date inputs. */
export function normalizeDateInput(value: unknown): string {
  if (value == null || value === "") return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str.slice(0, 10);
}

export function baptismRowToFormState(row: BaptismRecordRow): BaptismFormState {
  return {
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    birth_date: normalizeDateInput(row.birth_date),
    reception_date: normalizeDateInput(row.reception_date),
    birthplace: row.birthplace ?? "",
    entry_type: row.entry_type ?? "",
    sponsors: row.sponsors ?? "",
    parents: row.parents ?? "",
    clergy: row.clergy ?? "",
  };
}

export function parseBaptismRowFromApi(raw: unknown): BaptismRecordRow | null {
  try {
    return parseBaptismRecordRow(raw);
  } catch {
    return null;
  }
}

/** Map form → POST body; church_id always from session (never URL). */
export function formStateToCreatePayload(
  form: BaptismFormState,
  churchId: number,
): BaptismRecordCreate {
  return parseBaptismRecordCreate({
    church_id: churchId,
    first_name: trimOrEmpty(form.first_name),
    last_name: trimOrEmpty(form.last_name),
    birth_date: trimOrEmpty(form.birth_date),
    reception_date: optionalField(form.reception_date),
    birthplace: optionalField(form.birthplace),
    entry_type: optionalField(form.entry_type),
    sponsors: optionalField(form.sponsors),
    parents: optionalField(form.parents),
    clergy: trimOrEmpty(form.clergy),
  });
}

/** Map form → PUT body; church_id always from session (never URL). */
export function formStateToUpdatePayload(
  form: BaptismFormState,
  churchId: number,
): BaptismRecordUpdate {
  return parseBaptismRecordUpdate({
    church_id: churchId,
    first_name: trimOrEmpty(form.first_name),
    last_name: trimOrEmpty(form.last_name),
    birth_date: optionalField(form.birth_date),
    reception_date: optionalField(form.reception_date),
    birthplace: optionalField(form.birthplace),
    entry_type: optionalField(form.entry_type),
    sponsors: optionalField(form.sponsors),
    parents: optionalField(form.parents),
    clergy: trimOrEmpty(form.clergy),
  });
}

export type BaptismFormValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export function validateBaptismFormForCreate(
  form: BaptismFormState,
): BaptismFormValidation {
  try {
    formStateToCreatePayload(form, 1);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: formatZodError(err),
    };
  }
}

export function validateBaptismFormForUpdate(
  form: BaptismFormState,
): BaptismFormValidation {
  try {
    formStateToUpdatePayload(form, 1);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: formatZodError(err),
    };
  }
}

function formatZodError(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: readonly { message?: string }[] }).issues;
    const first = issues[0]?.message;
    if (first) return first;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Please check required fields.";
}

/** Extract numeric PK from list id (`baptism:9`) or deep-link `recordId`. */
export function parseBaptismRecordId(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const composite = /^baptism:(\d+)$/i.exec(raw.trim());
  if (composite) return Number(composite[1]);
  if (/^\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
}
