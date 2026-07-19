import type { PortalUser } from "./types";

type LooseUser = {
  readonly id?: unknown;
  readonly email?: unknown;
  readonly username?: unknown;
  readonly first_name?: unknown;
  readonly last_name?: unknown;
  readonly display_name?: unknown;
  readonly role?: unknown;
  readonly church_id?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function initialsFrom(name: string, email: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase() || "U";
}

export function portalUserFromPayload(raw: unknown): PortalUser | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as LooseUser;

  const id = asNumber(record.id);
  const email = asString(record.email);
  if (id === null || email === null) return null;

  const composedName = [asString(record.first_name), asString(record.last_name)]
    .filter(Boolean)
    .join(" ");
  const displayName =
    asString(record.display_name) ??
    (composedName.length > 0
      ? composedName
      : (asString(record.username) ?? email));

  const role = asString(record.role) ?? "member";

  return {
    id,
    email,
    displayName,
    role,
    initials: initialsFrom(displayName, email),
    churchId: asNumber(record.church_id),
  };
}

export const MOCK_PILOT_USER: PortalUser = {
  id: 1,
  email: "parish.admin@example.com",
  displayName: "Parish Administrator",
  role: "Church Administrator",
  initials: "PA",
  churchId: 1,
};
