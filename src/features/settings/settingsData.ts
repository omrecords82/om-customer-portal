export type ParishProfile = {
  readonly name: string;
  readonly shortName: string;
  readonly location: string;
  readonly diocese: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
};

export type ParishUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly status: "active" | "invited" | "disabled";
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
