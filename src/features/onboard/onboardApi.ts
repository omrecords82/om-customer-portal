import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import { extractApiMessage } from "../settings/settingsApi";

/**
 * Wave I onboarding progress client.
 * Parity: legacy enrollment provisioning checklist + first-login `/api/onboarding/me`
 *   - GET /api/onboarding/me — first-login status (password, record tables/layouts)
 *   - GET /api/onboarding/provisioning-checklist — six-step parish preparation checklist
 * Admin checklist writers remain at `/api/admin/onboarding/:id/checklist/*`.
 */

export type OnboardStepStatus =
  | "completed"
  | "processing"
  | "pending"
  | "failed"
  | "blocked";

export type OnboardStep = {
  readonly id: string;
  readonly label: string;
  readonly status: OnboardStepStatus;
};

export type ProvisioningStepDef = {
  readonly id: string;
  readonly label: string;
};

export const PROVISIONING_STEP_DEFS: readonly ProvisioningStepDef[] = [
  { id: "church_profile", label: "Preparing Church Profile" },
  { id: "database_storage", label: "Provisioning Database & Storage" },
  { id: "users_roles", label: "Configuring Users, Roles & Permissions" },
  { id: "branding_portal", label: "Applying Branding & Portal Template" },
  { id: "records_certificates", label: "Importing Records & Enabling Certificates" },
  { id: "final_validation", label: "Running Final Validation" },
];

export type OnboardingMeSlice = {
  readonly onboardingRequestId: string | null;
  readonly status: string | null;
  readonly mustChangePassword: boolean;
  readonly tableConfigurationCompleted: boolean;
  readonly layoutConfigurationCompleted: boolean;
  readonly firstLoginCompleted: boolean;
};

export type ChecklistRow = {
  readonly step_key: string;
  readonly step_name: string;
  readonly status: string;
};

export type FetchOnboardProgressResult =
  | {
      readonly ok: true;
      readonly source: "preview";
      readonly steps: readonly OnboardStep[];
      readonly me: null;
      readonly checklistLive: false;
    }
  | {
      readonly ok: true;
      readonly source: "live";
      readonly steps: readonly OnboardStep[];
      readonly me: OnboardingMeSlice | null;
      readonly checklistLive: boolean;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export const STORAGE_KEY = "om_portal2_onboard_progress";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

/** Map OM checklist row status to portal step UI status. */
export function mapChecklistStatusToUiStatus(apiStatus: string): OnboardStepStatus {
  switch (apiStatus) {
    case "passed":
    case "skipped":
      return "completed";
    case "in_progress":
      return "processing";
    case "failed":
      return "failed";
    case "blocked":
      return "blocked";
    default:
      return "pending";
  }
}

/** Build ordered portal steps from live provisioning checklist rows. */
export function checklistToSteps(
  checklist: readonly ChecklistRow[],
  defs: readonly ProvisioningStepDef[] = PROVISIONING_STEP_DEFS,
): OnboardStep[] {
  const byKey = new Map(checklist.map((row) => [row.step_key, row]));
  return defs.map((def) => {
    const row = byKey.get(def.id);
    if (!row) {
      return { id: def.id, label: def.label, status: "pending" as const };
    }
    return {
      id: def.id,
      label: row.step_name.trim() || def.label,
      status: mapChecklistStatusToUiStatus(row.status),
    };
  });
}

/** Approximate checklist cursor from enrollment request status when checklist API is absent. */
export function enrollmentStatusToCursor(status: string | null | undefined): number {
  switch (status) {
    case "postal_verification_pending":
    case "submitted":
    case "reviewing":
    case "payment_pending":
      return 0;
    case "payment_received":
      return 1;
    case "provisioning":
      return 2;
    case "admin_account_created":
      return 3;
    case "awaiting_first_login":
      return 4;
    case "record_tables_review":
      return 5;
    case "active":
      return PROVISIONING_STEP_DEFS.length;
    default:
      return 0;
  }
}

export function stepsFromCursor(
  cursor: number,
  defs: readonly ProvisioningStepDef[] = PROVISIONING_STEP_DEFS,
): OnboardStep[] {
  return defs.map((step, index) => {
    if (cursor >= defs.length) {
      return { ...step, status: "completed" as const };
    }
    if (index < cursor) return { ...step, status: "completed" as const };
    if (index === cursor) return { ...step, status: "processing" as const };
    return { ...step, status: "pending" as const };
  });
}

/** Derive preparation steps from `/api/onboarding/me` when checklist endpoint is unavailable. */
export function deriveStepsFromOnboardingMe(me: OnboardingMeSlice): OnboardStep[] {
  let cursor = enrollmentStatusToCursor(me.status);
  if (me.status === "record_tables_review") {
    if (!me.tableConfigurationCompleted) cursor = 4;
    else if (!me.layoutConfigurationCompleted) cursor = 5;
    else cursor = PROVISIONING_STEP_DEFS.length;
  }
  if (me.status === "active") {
    cursor = PROVISIONING_STEP_DEFS.length;
  }
  return stepsFromCursor(cursor);
}

export function allCompletedSteps(
  defs: readonly ProvisioningStepDef[] = PROVISIONING_STEP_DEFS,
): OnboardStep[] {
  return defs.map((step) => ({ ...step, status: "completed" as const }));
}

export function initialPreviewSteps(): OnboardStep[] {
  return stepsFromCursor(1);
}

export function readPersistedCursor(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cursor?: unknown };
    return typeof parsed.cursor === "number" ? parsed.cursor : null;
  } catch {
    return null;
  }
}

export function writePersistedCursor(cursor: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ cursor, savedAt: Date.now() }));
}

export function parseOnboardingMe(payload: unknown): OnboardingMeSlice | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.success === false) return null;
  const onboarding =
    root.onboarding && typeof root.onboarding === "object"
      ? (root.onboarding as Record<string, unknown>)
      : null;
  if (!onboarding) {
    return {
      onboardingRequestId: null,
      status: null,
      mustChangePassword: false,
      tableConfigurationCompleted: false,
      layoutConfigurationCompleted: false,
      firstLoginCompleted: false,
    };
  }
  return {
    onboardingRequestId: asString(onboarding.onboarding_request_id) || null,
    status: asString(onboarding.status) || null,
    mustChangePassword: asBool(onboarding.must_change_password),
    tableConfigurationCompleted: asBool(onboarding.table_configuration_completed),
    layoutConfigurationCompleted: asBool(onboarding.layout_configuration_completed),
    firstLoginCompleted: asBool(onboarding.first_login_completed),
  };
}

export function parseProvisioningChecklist(payload: unknown): ChecklistRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  if (root.success === false) return [];
  const checklist = root.checklist;
  if (!Array.isArray(checklist)) return [];
  return checklist
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => ({
      step_key: asString(row.step_key),
      step_name: asString(row.step_name),
      status: asString(row.status, "not_started"),
    }))
    .filter((row) => row.step_key.length > 0);
}

async function fetchOnboardingMe(): Promise<{
  readonly ok: boolean;
  readonly me: OnboardingMeSlice | null;
  readonly status: number;
  readonly message: string;
}> {
  const res = await apiFetch("/api/onboarding/me", { method: "GET" });
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      me: null,
      status: res.status,
      message: extractApiMessage(payload, `Onboarding status unavailable (${String(res.status)}).`),
    };
  }
  return { ok: true, me: parseOnboardingMe(payload), status: res.status, message: "" };
}

async function fetchProvisioningChecklist(): Promise<{
  readonly ok: boolean;
  readonly checklist: ChecklistRow[];
  readonly status: number;
  readonly message: string;
}> {
  const res = await apiFetch("/api/onboarding/provisioning-checklist", { method: "GET" });
  const payload: unknown = await res.json().catch(() => null);
  if (res.status === 404) {
    return { ok: false, checklist: [], status: 404, message: "Checklist endpoint not found." };
  }
  if (!res.ok) {
    return {
      ok: false,
      checklist: [],
      status: res.status,
      message: extractApiMessage(payload, `Checklist unavailable (${String(res.status)}).`),
    };
  }
  return {
    ok: true,
    checklist: parseProvisioningChecklist(payload),
    status: res.status,
    message: "",
  };
}

/** Load onboarding preparation progress — live APIs when AUTH_MODE=live, else preview/local. */
export async function fetchOnboardProgress(): Promise<FetchOnboardProgressResult> {
  if (authMode !== "live") {
    const saved = readPersistedCursor();
    return {
      ok: true,
      source: "preview",
      steps: saved == null ? initialPreviewSteps() : stepsFromCursor(saved),
      me: null,
      checklistLive: false,
    };
  }

  try {
    const [meResult, checklistResult] = await Promise.all([
      fetchOnboardingMe(),
      fetchProvisioningChecklist(),
    ]);

    if (!meResult.ok && meResult.status !== 404) {
      return { ok: false, message: meResult.message, status: meResult.status };
    }

    const me = meResult.me;
    const checklist = checklistResult.checklist;

    if (checklistResult.ok && checklist.length > 0) {
      return {
        ok: true,
        source: "live",
        steps: checklistToSteps(checklist),
        me,
        checklistLive: true,
      };
    }

    if (me?.onboardingRequestId) {
      return {
        ok: true,
        source: "live",
        steps: deriveStepsFromOnboardingMe(me),
        me,
        checklistLive: false,
      };
    }

    return {
      ok: true,
      source: "live",
      steps: allCompletedSteps(),
      me,
      checklistLive: false,
    };
  } catch {
    return { ok: false, message: "Network error loading onboarding progress.", status: 0 };
  }
}
