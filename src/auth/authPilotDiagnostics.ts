import type { ParishChromeSource } from "../shell/parishProfileState";
import type { AuthMode } from "./config";
import type { PortalUser } from "./types";

export type AuthPilotDiagnosticLine = {
  readonly label: string;
  readonly value: string;
  /** null = informational only (no pass/fail) */
  readonly ok: boolean | null;
};

export type AuthPilotDiagnosticInput = {
  readonly authMode: AuthMode;
  readonly requireAuth: boolean;
  readonly ready: boolean;
  readonly isAuthenticated: boolean;
  readonly user: PortalUser | null;
  readonly parishSource: ParishChromeSource;
  readonly parishLoading: boolean;
  readonly parishError: string | null;
};

function churchContextOk(churchId: number | null | undefined): boolean {
  return churchId != null && churchId > 0;
}

/** Live-mode session + church context lines for operator verification (Account page). */
export function buildAuthPilotDiagnostics(
  input: AuthPilotDiagnosticInput,
): readonly AuthPilotDiagnosticLine[] {
  if (input.authMode !== "live") return [];

  const churchId = input.user?.churchId ?? null;
  const churchOk = input.isAuthenticated && churchContextOk(churchId);

  const parishOk =
    input.isAuthenticated &&
    !input.parishLoading &&
    input.parishSource === "live" &&
    !input.parishError;

  return [
    {
      label: "Auth mode",
      value: "live",
      ok: true,
    },
    {
      label: "Require auth",
      value: input.requireAuth ? "true" : "false",
      ok: null,
    },
    {
      label: "Session bootstrap",
      value: input.ready
        ? input.isAuthenticated
          ? "authenticated"
          : "anonymous"
        : "loading",
      ok: input.ready ? (input.isAuthenticated ? true : false) : null,
    },
    {
      label: "User id",
      value: input.user?.id != null ? String(input.user.id) : "—",
      ok: input.isAuthenticated && input.user?.id != null ? true : false,
    },
    {
      label: "Role",
      value: input.user?.role ?? "—",
      ok: input.isAuthenticated && Boolean(input.user?.role) ? true : false,
    },
    {
      label: "Church context (session)",
      value: churchId != null ? String(churchId) : "missing",
      ok: churchOk,
    },
    {
      label: "Parish settings API",
      value: input.parishLoading
        ? "loading"
        : input.parishSource === "live"
          ? "live"
          : input.parishError
            ? `error: ${input.parishError}`
            : input.parishSource,
      ok: parishOk,
    },
  ];
}
