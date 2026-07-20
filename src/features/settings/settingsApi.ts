import { apiFetch } from "../../auth/apiFetch";
import { authMode } from "../../auth/config";
import type {
  JurisdictionOption,
  NotificationPrefs,
  OcrPrefs,
  ParishProfile,
  ParishUser,
  ParishUserStatus,
  UserSession,
  UserSessionStatus,
} from "./settingsData";
import { DEFAULT_PARISH, MOCK_PARISH_USERS, MOCK_USER_SESSIONS } from "./settingsData";

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

export type PortalOcrSlice = OcrPrefs & {
  /** True when autoseed toggle is backed by live `/api/my/ocr-preferences`. */
  readonly autoseedLive: boolean;
  /** Always false in live — no matching API field for review auto-open. */
  readonly autoOpenReviewLive: boolean;
  /** Church-level OCR feature flag from GET response. */
  readonly ocrEnabled: boolean;
};

export type FetchOcrPrefsResult =
  | {
      readonly ok: true;
      readonly source: "preview" | "live";
      readonly prefs: PortalOcrSlice;
      readonly editable: boolean;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type SaveOcrPrefsResult =
  | { readonly ok: true; readonly source: "preview" | "live" }
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

/** Matches OM `/api/my/ocr-preferences` admin gate. */
const OCR_ADMIN_ROLES = new Set(["super_admin", "admin", "church_admin"]);

export type OcrApiPreferences = {
  readonly language?: unknown;
  readonly defaultLanguage?: unknown;
  readonly confidenceThreshold?: unknown;
  readonly deskew?: unknown;
  readonly removeNoise?: unknown;
  readonly preprocessImages?: unknown;
  readonly useRecordSnippets?: unknown;
  readonly documentProcessing?: unknown;
  readonly documentDeletion?: unknown;
};

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

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function churchSettingsToParishProfile(
  settings: Record<string, unknown>,
): ParishProfile {
  const jurisdictionName =
    asString(settings.jurisdiction_name) ||
    asString(settings.jurisdiction) ||
    DEFAULT_PARISH.jurisdictionName;
  const jurisdictionId = asNullableNumber(settings.jurisdiction_id);
  const calendarFromJurisdiction = asString(settings.jurisdiction_calendar_type);
  const calendarType =
    calendarFromJurisdiction ||
    asString(settings.calendar_type) ||
    DEFAULT_PARISH.calendarType;

  return {
    name: getChurchDisplayName(settings) || DEFAULT_PARISH.name,
    shortName: asString(settings.short_name) || DEFAULT_PARISH.shortName,
    email: asString(settings.email) || DEFAULT_PARISH.email,
    phone: asString(settings.phone) || DEFAULT_PARISH.phone,
    website: asString(settings.website) || DEFAULT_PARISH.website,
    address: asString(settings.address) || DEFAULT_PARISH.address,
    city: asString(settings.city) || DEFAULT_PARISH.city,
    stateProvince: asString(settings.state_province) || DEFAULT_PARISH.stateProvince,
    postalCode: asString(settings.postal_code) || DEFAULT_PARISH.postalCode,
    country: asString(settings.country) || DEFAULT_PARISH.country,
    jurisdictionId,
    jurisdictionName,
    calendarType,
    preferredLanguage: asString(settings.preferred_language) || DEFAULT_PARISH.preferredLanguage,
  };
}

export function parishProfileToChurchPayload(
  profile: ParishProfile,
): Record<string, string | number | null> {
  const payload: Record<string, string | number | null> = {
    name: profile.name.trim(),
    short_name: profile.shortName.trim(),
    email: profile.email.trim(),
    phone: profile.phone.trim(),
    website: profile.website.trim(),
    address: profile.address.trim(),
    city: profile.city.trim(),
    state_province: profile.stateProvince.trim(),
    postal_code: profile.postalCode.trim(),
    country: profile.country.trim(),
    preferred_language: profile.preferredLanguage.trim() || "en",
    jurisdiction: profile.jurisdictionName.trim(),
    jurisdiction_id: profile.jurisdictionId,
  };
  return payload;
}

export function parseJurisdictionsResponse(payload: unknown): JurisdictionOption[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const items = root.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => ({
      id: Number(row.id),
      name: asString(row.name),
      abbreviation: asString(row.abbreviation),
      calendarType: asString(row.calendar_type),
    }))
    .filter((row) => Number.isFinite(row.id) && row.name.length > 0);
}

export type FetchJurisdictionsResult =
  | { readonly ok: true; readonly jurisdictions: readonly JurisdictionOption[] }
  | { readonly ok: false; readonly message: string; readonly status: number };

/** GET /api/jurisdictions — reference list for parish liturgical settings. */
export async function fetchJurisdictions(): Promise<FetchJurisdictionsResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      jurisdictions: [
        {
          id: 1,
          name: "Diocese of New York & New Jersey",
          abbreviation: "OCA-NY-NJ",
          calendarType: "Revised Julian",
        },
      ],
    };
  }

  try {
    const res = await apiFetch("/api/jurisdictions", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Jurisdictions unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    return { ok: true, jurisdictions: parseJurisdictionsResponse(payload) };
  } catch {
    return { ok: false, message: "Network error loading jurisdictions.", status: 0 };
  }
}

/** Apply jurisdiction picker selection to parish profile (calendar derived read-only). */
export function applyJurisdictionSelection(
  profile: ParishProfile,
  jurisdiction: JurisdictionOption | null,
): ParishProfile {
  if (!jurisdiction) {
    return {
      ...profile,
      jurisdictionId: null,
      jurisdictionName: "",
      calendarType: "",
    };
  }
  return {
    ...profile,
    jurisdictionId: jurisdiction.id,
    jurisdictionName: jurisdiction.name,
    calendarType: jurisdiction.calendarType,
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

export function canManageOcrPrefs(role: string | undefined): boolean {
  if (!role) return false;
  return OCR_ADMIN_ROLES.has(role);
}

function unwrapOcrPreferences(payload: unknown): {
  readonly prefs: OcrApiPreferences | null;
  readonly ocrEnabled: boolean;
} {
  if (!payload || typeof payload !== "object") {
    return { prefs: null, ocrEnabled: true };
  }
  const root = payload as Record<string, unknown>;
  const preferences = root.preferences;
  const ocrEnabled = root.ocrEnabled !== false;
  if (!preferences || typeof preferences !== "object") {
    return { prefs: null, ocrEnabled };
  }
  return { prefs: preferences, ocrEnabled };
}

/** Map GET `/api/my/ocr-preferences` to simplified portal OCR toggles. */
export function ocrApiPrefsToPortalPrefs(
  apiPrefs: OcrApiPreferences,
  ocrEnabled = true,
): PortalOcrSlice {
  const useRecordSnippets =
    apiPrefs.useRecordSnippets === undefined
      ? true
      : asBool(apiPrefs.useRecordSnippets);

  return {
    defaultMode: useRecordSnippets ? "autoseed" : "standard",
    autoOpenReview: true,
    autoseedLive: true,
    autoOpenReviewLive: false,
    ocrEnabled,
  };
}

/** Map simplified portal OCR toggles to partial PUT body. */
export function portalOcrPrefsToApiUpdate(prefs: OcrPrefs): { useRecordSnippets: boolean } {
  return {
    useRecordSnippets: prefs.defaultMode === "autoseed",
  };
}

function previewOcrPrefs(): PortalOcrSlice {
  return {
    defaultMode: "standard",
    autoOpenReview: true,
    autoseedLive: false,
    autoOpenReviewLive: true,
    ocrEnabled: true,
  };
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

function asSessionStatus(value: unknown): UserSessionStatus {
  if (value === "revoked" || value === "expired") return value;
  return "active";
}

function sessionRowToUserSession(row: SessionApiRow): UserSession | null {
  const rawId = row.id ?? row.session_id;
  if (rawId == null) return null;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  const id = String(rawId);
  if (!id) return null;
  const createdAt = asString(row.created_at);
  const expiresAt = asString(row.expires_at);
  if (!createdAt || !expiresAt) return null;

  return {
    id,
    isCurrent: row.is_current === true || row.is_current === 1,
    status: asSessionStatus(row.status),
    ipAddress: row.ip_address == null ? null : asString(row.ip_address),
    userAgent: row.user_agent == null ? null : asString(row.user_agent),
    createdAt,
    expiresAt,
  };
}

/** Normalize GET /api/user/sessions response shapes. */
export function parseUserSessionsResponse(payload: unknown): UserSession[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  if (root.success === false) return [];

  const data = root.data;
  if (data && typeof data === "object") {
    const sessions = (data as Record<string, unknown>).sessions;
    if (Array.isArray(sessions)) {
      return sessions
        .map((row) => sessionRowToUserSession(row as SessionApiRow))
        .filter((session): session is UserSession => session != null);
    }
  }

  const direct = root.sessions;
  if (Array.isArray(direct)) {
    return direct
      .map((row) => sessionRowToUserSession(row as SessionApiRow))
      .filter((session): session is UserSession => session != null);
  }

  return [];
}

export type ParsedUserAgent = {
  readonly browser: string;
  readonly os: string;
  readonly deviceType: "desktop" | "mobile" | "tablet" | "cli" | "unknown";
};

/** Best-effort user-agent parsing for session labels. */
export function parseSessionUserAgent(ua: string | null): ParsedUserAgent {
  if (!ua) return { browser: "Unknown", os: "Unknown", deviceType: "unknown" };

  if (/^curl\//i.test(ua)) return { browser: "curl (CLI)", os: "Command Line", deviceType: "cli" };
  if (/^python/i.test(ua)) return { browser: "Python HTTP", os: "Command Line", deviceType: "cli" };
  if (/^node/i.test(ua)) return { browser: "Node.js", os: "Command Line", deviceType: "cli" };
  if (/^wget/i.test(ua)) return { browser: "wget (CLI)", os: "Command Line", deviceType: "cli" };

  let browser = "Unknown Browser";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  if (/HeadlessChrome/i.test(ua)) browser = "Headless Chrome";

  let os = "Unknown OS";
  if (/Windows NT 10/i.test(ua) || /Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  let deviceType: ParsedUserAgent["deviceType"] = "desktop";
  if (/Mobile/i.test(ua) || /Android.*Mobile/i.test(ua) || /iPhone/i.test(ua)) {
    deviceType = "mobile";
  } else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    deviceType = "tablet";
  }

  return { browser, os, deviceType };
}

export function formatSessionLabel(session: Pick<UserSession, "userAgent">): string {
  const { browser, os } = parseSessionUserAgent(session.userAgent);
  return `${browser} on ${os}`;
}

export function maskSessionIp(ip: string | null): string {
  if (!ip) return "Unknown";
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "127.0.0.1" || ip === "::1") {
    return ip;
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    const [a, b, c] = parts;
    if (a && b && c) return `${a}.${b}.${c}.***`;
  }
  return ip;
}

export function formatSessionRelativeTime(dateStr: string, nowMs = Date.now()): string {
  const diffMs = nowMs - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  if (diffDays < 7) return `${String(diffDays)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sessionAuthHeaders(): HeadersInit {
  const headers = new Headers();
  const refresh = localStorage.getItem("refresh_token");
  if (refresh) headers.set("x-refresh-token", refresh);
  return headers;
}

/** GET /api/user/sessions — list active login sessions for the current user. */
export async function fetchUserSessions(): Promise<FetchUserSessionsResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview", sessions: MOCK_USER_SESSIONS };
  }

  try {
    const res = await apiFetch("/api/user/sessions", {
      method: "GET",
      headers: sessionAuthHeaders(),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Sessions unavailable (${String(res.status)}).`),
        status: res.status,
      };
    }
    return {
      ok: true,
      source: "live",
      sessions: parseUserSessionsResponse(payload),
    };
  } catch {
    return { ok: false, message: "Network error loading sessions.", status: 0 };
  }
}

/** DELETE /api/user/sessions/:id — revoke one non-current session. */
export async function revokeUserSession(sessionId: string): Promise<RevokeUserSessionResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      message: "Session revoked locally (preview mode).",
    };
  }

  try {
    const res = await apiFetch(`/api/user/sessions/${sessionId}`, {
      method: "DELETE",
      headers: sessionAuthHeaders(),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(payload, `Could not revoke session (${String(res.status)}).`),
        status: res.status,
      };
    }
    return {
      ok: true,
      source: "live",
      message: extractApiMessage(payload, "Session revoked successfully."),
    };
  } catch {
    return { ok: false, message: "Network error revoking session.", status: 0 };
  }
}

/** POST /api/user/sessions/revoke-others — sign out all devices except this one. */
export async function revokeOtherUserSessions(): Promise<RevokeOtherSessionsResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      message: "Other sessions revoked locally (preview mode).",
      revokedCount: MOCK_USER_SESSIONS.filter((session) => !session.isCurrent).length,
    };
  }

  try {
    const res = await apiFetch("/api/user/sessions/revoke-others", {
      method: "POST",
      headers: sessionAuthHeaders(),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `Could not revoke other sessions (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }

    let revokedCount = 0;
    if (payload && typeof payload === "object") {
      const root = payload as Record<string, unknown>;
      const data = root.data;
      if (data && typeof data === "object") {
        const nested = (data as Record<string, unknown>).revoked_count;
        if (typeof nested === "number") revokedCount = nested;
      }
      const direct = root.revoked_count;
      if (typeof direct === "number") revokedCount = direct;
    }

    return {
      ok: true,
      source: "live",
      message: extractApiMessage(payload, "Other sessions revoked."),
      revokedCount,
    };
  } catch {
    return { ok: false, message: "Network error revoking other sessions.", status: 0 };
  }
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

export type FetchUserSessionsResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly sessions: readonly UserSession[] }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type RevokeUserSessionResult =
  | { readonly ok: true; readonly source: "preview" | "live"; readonly message: string }
  | { readonly ok: false; readonly message: string; readonly status: number };

export type RevokeOtherSessionsResult =
  | {
      readonly ok: true;
      readonly source: "preview" | "live";
      readonly message: string;
      readonly revokedCount: number;
    }
  | { readonly ok: false; readonly message: string; readonly status: number };

type SessionApiRow = {
  readonly id?: unknown;
  readonly session_id?: unknown;
  readonly is_current?: unknown;
  readonly status?: unknown;
  readonly ip_address?: unknown;
  readonly user_agent?: unknown;
  readonly created_at?: unknown;
  readonly expires_at?: unknown;
};

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

/** GET `/api/my/ocr-preferences` — simplified autoseed toggle when admin + live. */
export async function fetchOcrPrefs(
  role: string | undefined,
): Promise<FetchOcrPrefsResult> {
  if (authMode !== "live") {
    return {
      ok: true,
      source: "preview",
      prefs: previewOcrPrefs(),
      editable: true,
    };
  }

  if (!canManageOcrPrefs(role)) {
    return {
      ok: true,
      source: "live",
      prefs: {
        ...previewOcrPrefs(),
        autoseedLive: false,
        autoOpenReviewLive: false,
      },
      editable: false,
    };
  }

  try {
    const res = await apiFetch("/api/my/ocr-preferences", { method: "GET" });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `OCR preferences unavailable (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }

    const { prefs: apiPrefs, ocrEnabled } = unwrapOcrPreferences(payload);
    if (!apiPrefs) {
      return {
        ok: false,
        message: "OCR preferences response was empty or malformed.",
        status: 502,
      };
    }

    return {
      ok: true,
      source: "live",
      prefs: ocrApiPrefsToPortalPrefs(apiPrefs, ocrEnabled),
      editable: ocrEnabled,
    };
  } catch {
    return {
      ok: false,
      message: "Network error loading OCR preferences.",
      status: 0,
    };
  }
}

/** PUT `/api/my/ocr-preferences` — persists autoseed ↔ useRecordSnippets mapping. */
export async function updateOcrPrefs(
  prefs: OcrPrefs,
  role: string | undefined,
): Promise<SaveOcrPrefsResult> {
  if (authMode !== "live") {
    return { ok: true, source: "preview" };
  }

  if (!canManageOcrPrefs(role)) {
    return {
      ok: false,
      message: "Your role cannot edit church OCR defaults.",
      status: 403,
    };
  }

  try {
    const res = await apiFetch("/api/my/ocr-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(portalOcrPrefsToApiUpdate(prefs)),
    });
    const payload: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        message: extractApiMessage(
          payload,
          `Could not save OCR preferences (${String(res.status)}).`,
        ),
        status: res.status,
      };
    }
    return { ok: true, source: "live" };
  } catch {
    return {
      ok: false,
      message: "Network error saving OCR preferences.",
      status: 0,
    };
  }
}
