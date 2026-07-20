import {
  SACRAMENT_RECORD_STATUSES,
  parseBaptismRecordCreate,
  parseBaptismRecordUpdate,
  type BaptismRecordCreate,
  type BaptismRecordRow,
  type BaptismRecordUpdate,
  type SacramentRecordStatus,
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

export const BAPTISM_ENTRY_TYPE_OPTIONS = [
  { value: "Baptism", label: "Baptism" },
  { value: "Chrismation", label: "Chrismation" },
] as const;

const BAPTISM_STATUS_ALIASES: Readonly<Record<string, SacramentRecordStatus>> = {
  active: "Recorded",
  recorded: "Recorded",
  verified: "Verified",
  "awaiting clergy": "Awaiting Clergy",
  draft: "Recorded",
  pending: "Awaiting Clergy",
};

function trimOrEmpty(value: string): string {
  return value.trim();
}

function optionalField(value: string): string | null | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function coercePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function nullableString(value: unknown): string | null {
  const trimmed = asString(value).trim();
  return trimmed === "" ? null : trimmed;
}

/** Normalize legacy OM status strings into contract enum values. */
export function normalizeBaptismStatus(raw: unknown): SacramentRecordStatus {
  const normalized = asString(raw).trim();
  if (!normalized) return "Recorded";
  const alias = BAPTISM_STATUS_ALIASES[normalized.toLowerCase()];
  if (alias) return alias;
  if ((SACRAMENT_RECORD_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as SacramentRecordStatus;
  }
  return "Recorded";
}

/** Normalize entry type for display / select (legacy values preserved on load). */
export function normalizeBaptismEntryType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "baptism") return "Baptism";
  if (lower === "chrismation") return "Chrismation";
  return trimmed;
}

/** Accept snake_case or legacy camelCase keys from OM GET payloads. */
export function normalizeBaptismRowFromApi(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  return {
    id: input.id,
    church_id: input.church_id ?? input.churchId,
    first_name: input.first_name ?? input.firstName,
    last_name: input.last_name ?? input.lastName,
    middle_name: input.middle_name ?? input.middleName,
    birth_date: input.birth_date ?? input.dateOfBirth ?? input.birthDate,
    reception_date: input.reception_date ?? input.dateOfBaptism ?? input.baptismDate,
    birthplace: input.birthplace ?? input.placeOfBirth,
    entry_type: input.entry_type ?? input.entryType,
    sponsors: input.sponsors ?? input.godparentNames,
    parents: input.parents,
    clergy: input.clergy ?? input.priest,
    status: input.status,
    verified_by: input.verified_by,
    verified_at: input.verified_at,
  };
}

/** Normalize API / ISO date strings to `YYYY-MM-DD` for date inputs. */
export function normalizeDateInput(value: unknown): string {
  if (value == null || value === "") return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str.slice(0, 10);
}

/** Today's date in local timezone as `YYYY-MM-DD` for `<input type="date" max>` and validation. */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

export function baptismRowToFormState(row: BaptismRecordRow): BaptismFormState {
  return {
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    birth_date: normalizeDateInput(row.birth_date),
    reception_date: normalizeDateInput(row.reception_date),
    birthplace: row.birthplace ?? "",
    entry_type: normalizeBaptismEntryType(row.entry_type ?? ""),
    sponsors: row.sponsors ?? "",
    parents: row.parents ?? "",
    clergy: row.clergy ?? "",
  };
}

/**
 * Lenient GET parser — legacy parish rows may have status `active`, empty last_name,
 * or empty clergy; strict `@om/contracts` row schema rejects those and blocked the editor.
 */
export function parseBaptismRowFromApi(raw: unknown): BaptismRecordRow | null {
  const normalized = normalizeBaptismRowFromApi(raw);
  if (!normalized) return null;

  const id = coercePositiveInt(normalized.id);
  const church_id = coercePositiveInt(normalized.church_id);
  if (id == null || church_id == null) return null;

  const first_name = asString(normalized.first_name).trim();
  if (!first_name) return null;

  return {
    id,
    church_id,
    first_name,
    last_name: asString(normalized.last_name).trim(),
    middle_name: asString(normalized.middle_name).trim() || undefined,
    birth_date: nullableString(normalized.birth_date),
    reception_date: nullableString(normalized.reception_date),
    birthplace: nullableString(normalized.birthplace),
    entry_type: nullableString(normalized.entry_type),
    sponsors: nullableString(normalized.sponsors),
    parents: nullableString(normalized.parents),
    clergy: asString(normalized.clergy).trim(),
    status: normalizeBaptismStatus(normalized.status),
    verified_by:
      normalized.verified_by == null ? undefined : normalized.verified_by,
    verified_at: nullableString(normalized.verified_at),
  };
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
    entry_type: optionalField(normalizeBaptismEntryType(form.entry_type)),
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
    entry_type: optionalField(normalizeBaptismEntryType(form.entry_type)),
    sponsors: optionalField(form.sponsors),
    parents: optionalField(form.parents),
    clergy: trimOrEmpty(form.clergy),
  });
}

export type BaptismFormValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

function formatZodError(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: readonly { message?: string }[] }).issues;
    const first = issues[0]?.message;
    if (first) return first;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Please check required fields.";
}

function validateEntryType(entryType: string): BaptismFormValidation {
  const normalized = normalizeBaptismEntryType(entryType);
  if (!normalized) return { ok: true };
  if (normalized === "Baptism" || normalized === "Chrismation") return { ok: true };
  return {
    ok: false,
    message: "Entry type must be Baptism or Chrismation.",
  };
}

function validateDateNotInFuture(
  value: string,
  label: string,
): BaptismFormValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true };
  if (trimmed > todayIsoDate()) {
    return { ok: false, message: `${label} cannot be in the future.` };
  }
  return { ok: true };
}

function validateBaptismDates(form: BaptismFormState): BaptismFormValidation {
  const birth = validateDateNotInFuture(form.birth_date, "Birth date");
  if (!birth.ok) return birth;
  return validateDateNotInFuture(form.reception_date, "Reception / baptism date");
}

export function validateBaptismFormForCreate(
  form: BaptismFormState,
): BaptismFormValidation {
  const entryType = validateEntryType(form.entry_type);
  if (!entryType.ok) return entryType;

  const dates = validateBaptismDates(form);
  if (!dates.ok) return dates;

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
  const entryType = validateEntryType(form.entry_type);
  if (!entryType.ok) return entryType;

  const dates = validateBaptismDates(form);
  if (!dates.ok) return dates;

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

/** Extract numeric PK from list id (`baptism:9`) or deep-link `recordId`. */
export function parseBaptismRecordId(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const composite = /^baptism:(\d+)$/i.exec(raw.trim());
  if (composite) return Number(composite[1]);
  if (/^\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
}
