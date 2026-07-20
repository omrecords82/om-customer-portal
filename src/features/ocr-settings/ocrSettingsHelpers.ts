import { parseClergyVariants, parseLocationMetadata, type OcrConfigEntity } from "./ocrSettingsApi";

export type ClergyVariantCount = {
  readonly value: string;
  readonly total: number;
};

export type ClergyFormState = {
  canonical_value: string;
  role: string;
  active_from: string;
  active_to: string;
  is_current: boolean;
  variants_json: string;
  source_notes: string;
};

export type LocationFormState = {
  location_type: string;
  canonical_value: string;
  display_label: string;
  street_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  variants_json: string;
  source_notes: string;
};

export const CLERGY_ROLE_OPTIONS = [
  "Rector",
  "Priest",
  "Deacon",
  "Archpriest",
  "Chancellor",
  "Other",
] as const;

export const LOCATION_TYPE_OPTIONS = [
  "Church",
  "Cemetery",
  "Chapel",
  "Other",
] as const;

export function defaultClergyForm(): ClergyFormState {
  return {
    canonical_value: "",
    role: "Rector",
    active_from: "",
    active_to: "",
    is_current: false,
    variants_json: "",
    source_notes: "",
  };
}

export function defaultLocationForm(): LocationFormState {
  return {
    location_type: "Other",
    canonical_value: "",
    display_label: "",
    street_address: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    variants_json: "",
    source_notes: "",
  };
}

export function formatClergyDate(val: unknown): string {
  if (val == null || val === "") return "";
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (!s) return "";
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? s;
}

export function clergyDateForApi(val: unknown): string | null {
  const formatted = formatClergyDate(val);
  return formatted || null;
}

export function parseClergyVariantsUi(variantsJson: unknown): ClergyVariantCount[] {
  const parsed = parseClergyVariants(variantsJson);
  return parsed.map((v) => ({ value: v.value, total: v.count }));
}

export function variantsToFormString(variants: ClergyVariantCount[]): string {
  return variants.map((v) => v.value).join(", ");
}

export function parseVariantsFromFormString(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function clergyFormFromEntity(entity: OcrConfigEntity): ClergyFormState {
  const variants = parseClergyVariantsUi(entity.variants_json);
  return {
    canonical_value: entity.canonical_value,
    role: entity.role ?? "Rector",
    active_from: formatClergyDate(entity.active_from),
    active_to: formatClergyDate(entity.active_to),
    is_current: !entity.active_to,
    variants_json: variantsToFormString(variants),
    source_notes: entity.source_notes ?? "",
  };
}

export function locationFormFromEntity(entity: OcrConfigEntity): LocationFormState {
  const meta = parseLocationMetadata(entity.metadata_json);
  const variants = parseClergyVariantsUi(entity.variants_json);
  return {
    location_type: meta.location_type ?? entity.role ?? "Other",
    canonical_value: entity.canonical_value,
    display_label: entity.display_label ?? "",
    street_address: meta.street_address ?? "",
    city: meta.city ?? "",
    state_province: meta.state_province ?? "",
    postal_code: meta.postal_code ?? "",
    country: meta.country ?? "",
    variants_json: variantsToFormString(variants),
    source_notes: entity.source_notes ?? "",
  };
}

export function buildClergyEntityPayload(form: ClergyFormState): Record<string, unknown> {
  return {
    entity_type: "clergy",
    canonical_value: form.canonical_value.trim(),
    role: form.role.trim() || "Rector",
    active_from: clergyDateForApi(form.active_from),
    active_to: form.is_current ? null : clergyDateForApi(form.active_to),
    variants_json: parseVariantsFromFormString(form.variants_json),
    source_notes: form.source_notes.trim() || null,
  };
}

export function buildLocationEntityPayload(
  form: LocationFormState,
  editing: OcrConfigEntity | null,
): Record<string, unknown> {
  const existingMeta = editing ? parseLocationMetadata(editing.metadata_json) : {};
  return {
    entity_type: "location",
    canonical_value: form.canonical_value.trim(),
    display_label: form.display_label.trim() || null,
    role: form.location_type,
    variants_json: parseVariantsFromFormString(form.variants_json),
    source_notes: form.source_notes.trim() || null,
    metadata_json: {
      location_type: form.location_type,
      street_address: form.street_address.trim() || null,
      city: form.city.trim() || null,
      state_province: form.state_province.trim() || null,
      postal_code: form.postal_code.trim() || null,
      country: form.country.trim() || null,
      tenant_default: existingMeta.tenant_default === "true" || existingMeta.tenant_default === "1",
      default_kind: existingMeta.default_kind ?? null,
      source: editing ? undefined : "manual",
    },
  };
}

export function isTenantDefaultLocation(entity: OcrConfigEntity): boolean {
  if (entity.entity_type !== "location") return false;
  const raw = entity.metadata_json;
  if (raw && typeof raw === "object") {
    const td = (raw as Record<string, unknown>).tenant_default;
    if (td === true || td === 1) return true;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed.tenant_default === true || parsed.tenant_default === 1;
    } catch {
      return false;
    }
  }
  const meta = parseLocationMetadata(raw);
  return meta.tenant_default === "true" || meta.tenant_default === "1";
}

export function formatVariantChipLabel(v: ClergyVariantCount): string {
  if (!v.total) return v.value;
  return `${v.value} (${String(v.total)})`;
}
