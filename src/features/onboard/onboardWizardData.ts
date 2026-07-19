import type { CatalogLayout, LayoutSelections, RecordTableDef } from "./onboardWizardApi";

export const WIZARD_STORAGE_KEY = "om_portal2_onboard_wizard";

export type PreviewWizardState = {
  readonly onboardingRequestId: string;
  readonly mustChangePassword: boolean;
  readonly tableConfigurationCompleted: boolean;
  readonly layoutConfigurationCompleted: boolean;
  readonly tables: RecordTableDef[];
  readonly selectedRecordTypes: readonly string[];
  readonly catalogByType: Record<string, CatalogLayout[]>;
  readonly selections: LayoutSelections;
};

const PREVIEW_BAPTISM_TABLE: RecordTableDef = {
  record_type: "baptism",
  table_key: "baptism_records",
  display_name: "Baptism Records",
  enabled: true,
  columns: [
    {
      column_key: "child_first_name",
      display_label: "Child First Name",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "child_last_name",
      display_label: "Child Last Name",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "baptism_date",
      display_label: "Date of Baptism",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "officiating_priest",
      display_label: "Officiating Priest",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "notes",
      display_label: "Notes",
      required: false,
      visible: true,
      editable: true,
      source: "system_default",
    },
  ],
};

const PREVIEW_MARRIAGE_TABLE: RecordTableDef = {
  record_type: "marriage",
  table_key: "marriage_records",
  display_name: "Marriage Records",
  enabled: true,
  columns: [
    {
      column_key: "marriage_date",
      display_label: "Marriage Date",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "groom_first_name",
      display_label: "Groom First Name",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "bride_first_name",
      display_label: "Bride First Name",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
    {
      column_key: "officiating_priest",
      display_label: "Officiating Priest",
      required: true,
      visible: true,
      editable: true,
      source: "system_default",
    },
  ],
};

const PREVIEW_THUMB =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect fill="#1a2e52" width="320" height="180"/><text x="160" y="96" fill="#d4af37" font-family="sans-serif" font-size="14" text-anchor="middle">Preview layout</text></svg>',
  );

function previewCatalog(recordType: string, suffix: string): CatalogLayout {
  return {
    id: `${recordType}_preview_${suffix}`,
    record_type: recordType,
    title: `${suffix} ledger style`,
    description: "Sample layout thumbnail for preview mode only.",
    extraction_mode: "structured_table",
    era_hint: "20th century",
    thumbnail: PREVIEW_THUMB,
  };
}

export function defaultPreviewWizardState(): PreviewWizardState {
  const selectedRecordTypes = ["baptism", "marriage"];
  return {
    onboardingRequestId: "ONB_PREVIEW",
    mustChangePassword: true,
    tableConfigurationCompleted: false,
    layoutConfigurationCompleted: false,
    tables: [PREVIEW_BAPTISM_TABLE, PREVIEW_MARRIAGE_TABLE],
    selectedRecordTypes,
    catalogByType: {
      baptism: [previewCatalog("baptism", "A"), previewCatalog("baptism", "B")],
      marriage: [previewCatalog("marriage", "A"), previewCatalog("marriage", "B")],
    },
    selections: {},
  };
}

export function readPreviewWizardState(): PreviewWizardState {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return defaultPreviewWizardState();
    const parsed = JSON.parse(raw) as Partial<PreviewWizardState>;
    const defaults = defaultPreviewWizardState();
    return {
      ...defaults,
      ...parsed,
      tables: Array.isArray(parsed.tables) ? parsed.tables : defaults.tables,
      selectedRecordTypes: Array.isArray(parsed.selectedRecordTypes)
        ? parsed.selectedRecordTypes
        : defaults.selectedRecordTypes,
      catalogByType:
        parsed.catalogByType && typeof parsed.catalogByType === "object"
          ? parsed.catalogByType
          : defaults.catalogByType,
      selections:
        parsed.selections && typeof parsed.selections === "object"
          ? parsed.selections
          : {},
    };
  } catch {
    return defaultPreviewWizardState();
  }
}

export function writePreviewWizardState(state: PreviewWizardState): void {
  localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
}
