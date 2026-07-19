export type ParishProfile = {
  readonly name: string;
  readonly shortName: string;
  readonly location: string;
  readonly diocese: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
};

export type ParishUserStatus = "active" | "invited" | "disabled" | "pending";

export type ParishUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly status: ParishUserStatus;
  /** True when OM marks the account locked pending first activation. */
  readonly isLocked?: boolean;
};

export type NotificationPrefs = {
  readonly emailDigest: boolean;
  readonly ocrJobAlerts: boolean;
  readonly certificateAlerts: boolean;
};

export type OcrPrefs = {
  readonly defaultMode: "standard" | "autoseed";
  readonly autoOpenReview: boolean;
};

export type UserSessionStatus = "active" | "revoked" | "expired";

export type UserSession = {
  readonly id: string;
  readonly isCurrent: boolean;
  readonly status: UserSessionStatus;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
};

export const DEFAULT_PARISH: ParishProfile = {
  name: "Saints Peter and Paul Orthodox Church",
  shortName: "Sts. Peter & Paul",
  location: "Manville, New Jersey",
  diocese: "Diocese of New York & New Jersey",
  phone: "(908) 555-0142",
  email: "office@stspp.example",
  website: "https://stspp.example",
};

export const MOCK_PARISH_USERS: readonly ParishUser[] = [
  {
    id: "u1",
    name: "Parish Administrator",
    email: "parish.admin@example.com",
    role: "Church Administrator",
    status: "active",
  },
  {
    id: "u2",
    name: "Fr. Michael",
    email: "priest@example.com",
    role: "Priest",
    status: "active",
  },
  {
    id: "u3",
    name: "Elena Records",
    email: "editor@example.com",
    role: "Editor",
    status: "invited",
  },
];

/** Preview-mode active sessions for Account security panel. */
export const MOCK_USER_SESSIONS: readonly UserSession[] = [
  {
    id: "preview-current",
    isCurrent: true,
    status: "active",
    ipAddress: "192.168.1.42",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    createdAt: "2026-07-19T14:00:00.000Z",
    expiresAt: "2026-07-26T14:00:00.000Z",
  },
  {
    id: "preview-mobile",
    isCurrent: false,
    status: "active",
    ipAddress: "10.0.0.15",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    createdAt: "2026-07-17T09:30:00.000Z",
    expiresAt: "2026-07-24T09:30:00.000Z",
  },
];
