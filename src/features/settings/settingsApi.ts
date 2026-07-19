import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import type {
  NotificationPrefs,
  OcrPrefs,
  ParishProfile,
  ParishUser,
  ParishUserStatus,
} from "./settingsData";
import { DEFAULT_PARISH, MOCK_PARISH_USERS } from "./settingsData";

/**
 * Wave C settings live client.
 * Parity: legacy Account Hub (`accountApi.ts`)
 *   - GET/PUT /api/user/profile — personal profile
 *   - PUT     /api/user/profile/password — password change
 *   - GET/PUT /api/my/church-settings — parish church details
 *   - GET/PUT /api/notifications/preferences — notification toggles
 */

export type UserProfileSlice = {
  readonly displayName: string;
  readonly email: string;
  readonly phone: string;
  readonly company: string;
  readonly location: string;
  readonly churchName: string | null;
};

export type PortalNotificationSlice = NotificationPrefs & {
  /** True when live API lacks a matching OCR job notification type. */
  readonly ocrJobAlertsLive: boolean;
};

export type FetchProfileResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly profile: UserProfileSlice }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type SaveProfileResult =
  | { readonly ok: true; readonly source: "preview" | "live" }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type ChangePasswordResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly message: string }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type FetchParishResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly profile: ParishProfile; readonly editable: boolean }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type SaveParishResult =
  | { readonly ok: true; readonly source: "preview" | "live" }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type FetchNotificationPrefsResult =
  | {
      readonly ok: true;
      readonly source: "preview" | "live";
      readonly prefs: PortalNotificationSlice;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type SaveNotificationPrefsResult =
  | { readonly ok: true; readonly source: "preview" | "live" }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type FetchOcrPrefsResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly prefs: OcrPrefs }
  | { readonly ok: false; readonly message: string; readonly status: number };

const NOTIF_WEEKLY_DIGEST = "weekly_digest";
const NOTIF_CERTIFICATE_READY = "certificate_ready";

const CHURCH_EDITOR_ROLES = new Set([
  "super_admin",
  "admin",
  "church_admin",
  "priest",
]);

/** Matches OM `church-users` parish staff scope (list + unlock). */
const PARISH_USER_ADMIN_ROLES = new Set([
  "super_admin",
  "admin",
  "church_admin",
  "priest",
  "manager",
]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

/** Extract a user-safe message from OM API error bodies. */
export function extractApiMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const obj = payload as Record<string, unknown>;
  const nested = obj.data;
  if (nested && typeof nested === "object") {
    const dataMsg = (nested as Record<string, unknown>).message;
    if (typeof dataMsg === "string" && dataMsg.trim()) return dataMsg.trim();
  }
  for (const key of ["message", "error"] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

/** Normalize `/api/my/church-settings` response shapes. */
export function extractChurchSettings(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.success === false) return null;
  const data = root.data;
  if (data && typeof data === "object") {
    const settings = (data as Record<string, unknown>).settings;
    if (settings && typeof settings === "object") {
      return settings as Record<string, unknown>;
    }
  }
  const direct = root.settings;
  if (direct && typeof direct === "object") {
    return direct as Record<string, unknown>;
  }
  return null;
}

export function getChurchDisplayName(settings: Record<string, unknown>): string {
  return asString(settings.name) || asString(settings.church_name);
}

export function formatChurchLocation(settings: Record<string, unknown>): string {
  const city = asString(settings.city);
  const state = asString(settings.state_province);
  if (city && state) return `${city}, ${state}`;
  return city || state || asString(settings.address);
}

export function churchSettingsToParishProfile(
  settings: Record<string, unknown>,
): ParishProfile {
  return {
    name: getChurchDisplayName(settings) || DEFAULT_PARISH.name,
    shortName: asString(settings.short_name) || DEFAULT_PARISH.shortName,
    location: formatChurchLocation(settings) || DEFAULT_PARISH.location,
    diocese:
      asString(settings.jurisdiction_name) ||
      asString(settings.jurisdiction) ||
      DEFAULT_PARISH.diocese,
    phone: asString(settings.phone) || DEFAULT_PARISH.phone,
    email: asString(settings.email) || DEFAULT_PARISH.email,
    website: asString(settings.website) || DEFAULT_PARISH.website,
  };
}

/** Split "City, State" into API fields; single token goes to city. */
export function parishLocationToApiFields(location: string): {
  readonly city: string;
  readonly state_province: string;
} {
  const trimmed = location.trim();
  if (!trimmed) return { city: "", state_province: "" };
  const comma = trimmed.indexOf(",");
  if (comma < 0) return { city: trimmed, state_province: "" };
  return {
    city: trimmed.slice(0, comma).trim(),
    state_province: trimmed.slice(comma + 1).trim(),
  };
}

export function parishProfileToChurchPayload(
  profile: ParishProfile,
): Record<string, string> {
  const { city, state_province } = parishLocationToApiFields(profile.location);
  return {
    name: profile.name.trim(),
    short_name: profile.shortName.trim(),
    city,
    state_province,
    jurisdiction: profile.diocese.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    website: profile.website.trim(),
  };
}

export function parseUserProfile(payload: unknown): UserProfileSlice | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.success === false) return null;
  const profile =
    root.profile && typeof root.profile === "object"
      ? (root.profile as Record<string, unknown>)
      : null;
  if (!profile) return null;

  const composed = [asString(profile.first_name), asString(profile.last_name)]
    .filter(Boolean)
    .join(" ");
  const displayName =
    asString(profile.display_name) || composed || asString(profile.email);

  return {
    displayName,
    email: asString(profile.email),
    phone: asString(profile.phone),
    company: asString(profile.company),
    location: asString(profile.location),
    churchName: asString(profile.church_name) || null,
  };
}

type NotificationRow = {
  readonly type_name: string;
  readonly email_enabled: unknown;
  readonly in_app_enabled: unknown;
};

export function notificationRowsToPortalPrefs(
  rows: readonly NotificationRow[],
): PortalNotificationSlice {
  const byType = new Map(rows.map((row) => [row.type_name, row]));
  const weekly = byType.get(NOTIF_WEEKLY_DIGEST);
  const cert = byType.get(NOTIF_CERTIFICATE_READY);

  return {
    emailDigest: weekly ? asBool(weekly.email_enabled) : true,
    ocrJobAlerts: false,
    certificateAlerts: cert ? asBool(cert.email_enabled) : false,
    ocrJobAlertsLive: false,
  };
}

export function portalPrefsToNotificationUpdates(
  prefs: NotificationPrefs,
  existing: readonly NotificationRow[],
): {
  type_name: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  frequency: string;
}[] {
  const byType = new Map(existing.map((row) => [row.type_name, row]));
  const updates: {
    type_name: string;
    email_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    sms_enabled: boolean;
    frequency: string;
  }[] = [];

  const weekly = byType.get(NOTIF_WEEKLY_DIGEST);
  if (weekly) {
    updates.push({
      type_name: NOTIF_WEEKLY_DIGEST,
      email_enabled: prefs.emailDigest,
      push_enabled: asBool(weekly.in_app_enabled),
      in_app_enabled: asBool(weekly.in_app_enabled),
      sms_enabled: false,
      frequency: "weekly",
    });
  }

  const cert = byType.get(NOTIF_CERTIFICATE_READY);
  if (cert) {
    updates.push({
      type_name: NOTIF_CERTIFICATE_READY,
      email_enabled: prefs.certificateAlerts,
      push_enabled: asBool(cert.in_app_enabled),
      in_app_enabled: asBool(cert.in_app_enabled),
      sms_enabled: false,
      frequency: "immediate",
    });
  }

  return updates;
}

export function canEditChurchSettings(role: string | undefined): boolean {
  if (!role) return false;
  return CHURCH_EDITOR_ROLES.has(role);
}

export function canViewParishUsers(role: string | undefined): boolean {
  if (!role) return false;
  return PARISH_USER_ADMIN_ROLES.has(role);
}

export function canUnlockParishUsers(role: string | undefined): boolean {
  return canViewParishUsers(role);
}

export type ChurchUserApiRow = {
  readonly id: unknown;
  readonly email: unknown;
  readonly first_name: unknown;
  readonly last_name: unknown;
  readonly system_role: unknown;
  readonly church_role: unknown;
  readonly is_active: unknown;
  readonly is_locked: unknown;
};

export function formatParishUserRole(
  churchRole: unknown,
  systemRole: unknown,
): string {
  const raw = asString(churchRole) || asString(systemRole);
  if (!raw) return "User";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function churchUserStatus(row: ChurchUserApiRow): ParishUserStatus {
  const locked = row.is_locked === 1 || row.is_locked === true;
  const active = row.is_active === 1 || row.is_active === true;
  if (locked) return "pending";
  if (!active) return "disabled";
  return "active";
}

export function churchUserRowToParishUser(row: ChurchUserApiRow): ParishUser {
  const first = asString(row.first_name);
  const last = asString(row.last_name);
  const composed = [first, last].filter(Boolean).join(" ");
  const email = asString(row.email);
  const locked = row.is_locked === 1 || row.is_locked === true;

  return {
    id: String(row.id),
    name: composed || email || "Unknown user",
    email,
    role: formatParishUserRole(row.church_role, row.system_role),
    status: churchUserStatus(row),
    isLocked: locked,
  };
}

export function parseChurchUsersResponse(payload: unknown): ParishUser[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  if (root.success === false) return [];

  const data = root.data;
  if (data && typeof data === "object") {
    const users = (data as Record<string, unknown>).users;
    if (Array.isArray(users)) {
      return users.map((row) => churchUserRowToParishUser(row as ChurchUserApiRow));
    }
  }

  const direct = root.users;
  if (Array.isArray(direct)) {
    return direct.map((row) => churchUserRowToParishUser(row as ChurchUserApiRow));
  }

  return [];
}

export type FetchParishUsersResult =
  | {
      readonly ok: true;
      readonly source: "preview" | "live";
      readonly users: readonly ParishUser[];
      readonly canUnlock: boolean;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type UnlockParishUserResult =
  | { readonly ok: true; readonly source: "preview" | "live" }
  | { readonly ok: false; readonly message: string; readonly status: number };

/** GET /api/admin/church-users/:churchId — parish staff scoped list. */
export async function fetchParishUsers(
  churchId: number | null | undefined,
  role: string | undefined,
): Promise<FetchParishUsersResult> {
  const canUnlock = canUnlockParishUsers(role);

  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      users: MOCK_PARISH_USERS,
      canUnlock: true,
    };
  }

  if (!churchId) {
    return {
      ok: false,
      message: "No church context on your session — parish users cannot load.",
      status: 400,
    };
  }

  if (!canViewParishUsers(role)) {
    return {
      ok: false,
      message:
        "Your role cannot view the parish user directory. Contact a church administrator.",
      status: 403,
    };
  }

  try {
    const res = await apiFetch(`/api/admin/church-users/${String(churchId)}`, {
      method: "GET",
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `Parish users unavailable (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    return {
      ok: true,
      source: "live",
      users: parseChurchUsersResponse(payload),
      canUnlock,
    };
  } catch {
    return {
      ok: false,
      message: "Network error loading parish users.",
      status: 0,
    };
  }
}

/** POST /api/admin/church-users/:churchId/:userId/unlock — activate pending accounts. */
export async function unlockParishUser(
  churchId: number | null | undefined,
  userId: string,
  role: string | undefined,
): Promise<UnlockParishUserResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview" };
  }

  if (!churchId) {
    return {
      ok: false,
      message: "No church context on your session.",
      status: 400,
    };
  }

  if (!canUnlockParishUsers(role)) {
    return {
      ok: false,
      message: "Your role cannot activate parish users.",
      status: 403,
    };
  }

  try {
    const res = await apiFetch(
      `/api/admin/church-users/${String(churchId)}/${userId}/unlock`,
      { method: "POST" },
    );
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `Could not activate user (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    return { ok: true, source: "live" };
  } catch {
    return {
      ok: false,
      message: "Network error activating user.",
      status: 0,
    };
  }
}

function mockProfileFromDisplayName(displayName: string, email: string): UserProfileSlice {
  return {
    displayName,
    email,
    phone: "",
    company: "",
    location: "",
    churchName: null,
  };
}

/** GET /api/user/profile */
export async function fetchUserProfile(
  fallback?: Pick<UserProfileSlice, "displayName" | "email">,
): Promise<FetchProfileResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      profile: mockProfileFromDisplayName(
        fallback?.displayName ?? "Parish Administrator",
        fallback?.email ?? "parish.admin@example.com",
      ),
    };
  }

  try {
    const res = await apiFetch("/api/user/profile", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Profile unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    const profile = parseUserProfile(payload);
    if (!profile) {
      return {
        ok: false,
        message: "Profile response was empty or malformed.",
        status: 502,
      };
    }
    return { ok: true, source: "live", profile };
  } catch {
    return { ok: false, message: "Network error loading profile.", status: 0 };
  }
}

/** PUT /api/user/profile */
export async function updateUserProfile(body: {
  readonly displayName: string;
  readonly phone?: string;
  readonly company?: string;
  readonly location?: string;
}): Promise<SaveProfileResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview" };
  }

  try {
    const res = await apiFetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: body.displayName.trim(),
        phone: body.phone?.trim() ?? "",
        company: body.company?.trim() ?? "",
        location: body.location?.trim() ?? "",
      }),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not save profile (${String(res.status)}).`),
        status: res.status,
      };
    }
    return { ok: true, source: "live" };
  } catch {
    return { ok: false, message: "Network error saving profile.", status: 0 };
  }
}

/** PUT /api/user/profile/password */
export async function changeUserPassword(body: {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}): Promise<ChangePasswordResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      message: "Password change recorded locally (preview mode).",
    };
  }

  try {
    const res = await apiFetch("/api/user/profile/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not change password (${String(res.status)}).`),
        status: res.status,
      };
    }
    return {
      ok: true,
      source: "live",
      message: extractApiMessage(payload, "Password updated successfully."),
    };
  } catch {
    return { ok: false, message: "Network error changing password.", status: 0 };
  }
}

/** GET /api/my/church-settings */
export async function fetchParishProfile(
  role: string | undefined,
): Promise<FetchParishResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      profile: DEFAULT_PARISH,
      editable: true,
    };
  }

  try {
    const res = await apiFetch("/api/my/church-settings", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Parish settings unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    const settings = extractChurchSettings(payload);
    if (!settings) {
      return {
        ok: false,
        message: "Parish settings response was empty or malformed.",
        status: 502,
      };
    }
    return {
      ok: true,
      source: "live",
      profile: churchSettingsToParishProfile(settings),
      editable: canEditChurchSettings(role),
    };
  } catch {
    return { ok: false, message: "Network error loading parish settings.", status: 0 };
  }
}

/** PUT /api/my/church-settings */
export async function updateParishProfile(
  profile: ParishProfile,
  role: string | undefined,
): Promise<SaveParishResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview" };
  }

  if (!canEditChurchSettings(role)) {
    return {
      ok: false,
      message: "Your role cannot edit parish church details.",
      status: 403,
    };
  }

  try {
    const res = await apiFetch("/api/my/church-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parishProfileToChurchPayload(profile)),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not save parish details (${String(res.status)}).`),
        status: res.status,
      };
    }
    return { ok: true, source: "live" };
  } catch {
    return { ok: false, message: "Network error saving parish details.", status: 0 };
  }
}

function unwrapNotificationRows(payload: unknown): NotificationRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const list = root.preferences;
  return Array.isArray(list) ? (list as NotificationRow[]) : [];
}

/** GET /api/notifications/preferences */
export async function fetchNotificationPrefs(): Promise<FetchNotificationPrefsResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      prefs: {
        emailDigest: true,
        ocrJobAlerts: true,
        certificateAlerts: false,
        ocrJobAlertsLive: false,
      },
    };
  }

  try {
    const res = await apiFetch("/api/notifications/preferences", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `Notification preferences unavailable (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    const rows = unwrapNotificationRows(payload);
    return {
      ok: true,
      source: "live",
      prefs: notificationRowsToPortalPrefs(rows),
    };
  } catch {
    return {
      ok: false,
      message: "Network error loading notification preferences.",
      status: 0,
    };
  }
}

/** PUT /api/notifications/preferences */
export async function updateNotificationPrefs(
  prefs: NotificationPrefs,
): Promise<SaveNotificationPrefsResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview" };
  }

  try {
    const currentRes = await apiFetch("/api/notifications/preferences", {
      method: "GET",
    });
    const currentPayload: unknown = await currentRes.json().catch(() => null);
    if (!currentRes.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          currentPayload,
          `Notification preferences unavailable (${String(currentRes.status)}).`,
        ),
        status: currentRes.status,
      };
    }

    const updates = portalPrefsToNotificationUpdates(
      prefs,
      unwrapNotificationRows(currentPayload),
    );
    if (updates.length === 0) {
      return {
        ok: false,
        message: "No supported notification types are available to update.",
        status: 400,
      };
    }

    const res = await apiFetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: updates }),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `Could not save notification preferences (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    return { ok: true, source: "live" };
  } catch {
    return {
      ok: false,
      message: "Network error saving notification preferences.",
      status: 0,
    };
  }
}

/** OCR simplified toggles — preview-only until portal UX maps to `/api/my/ocr-preferences`. */
export function fetchOcrPrefs(): FetchOcrPrefsResult {
  return {
    ok: true,
    source: "preview",
    prefs: {
      defaultMode: "standard",
      autoOpenReview: true,
    },
  };
}
