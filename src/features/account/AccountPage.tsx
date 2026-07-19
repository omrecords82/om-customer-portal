import { Badge, Card, Divider, Group, List, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { TextField } from "@om/ui/text-field";
import { Dialog } from "@om/ui/dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { buildAuthPilotDiagnostics } from "../../auth/authPilotDiagnostics";
import { authMode, requireAuth } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { parish } from "../../data/session";
import { useParishProfile } from "../../shell/ParishProfileProvider";
import {
  changeUserPassword,
  fetchNotificationPrefs,
  fetchUserProfile,
  fetchUserSessions,
  formatSessionLabel,
  formatSessionRelativeTime,
  maskSessionIp,
  revokeOtherUserSessions,
  revokeUserSession,
  updateNotificationPrefs,
  updateUserProfile,
} from "../settings/settingsApi";
import { MOCK_USER_SESSIONS, type UserSession } from "../settings/settingsData";
import { useOnboardingAction } from "../onboard/useOnboardingAction";

type SessionConfirm = {
  readonly title: string;
  readonly message: string;
  readonly action: () => Promise<void>;
};

export function AccountPage() {
  const { user, refresh, ready, isAuthenticated } = useAuth();
  const { source: parishSource, loading: parishLoading, error: parishError } =
    useParishProfile();
  const live = authMode === "live";
  const onboarding = useOnboardingAction();

  const pilotDiagnostics = useMemo(
    () =>
      buildAuthPilotDiagnostics({
        authMode,
        requireAuth,
        ready,
        isAuthenticated,
        user,
        parishSource,
        parishLoading,
        parishError,
      }),
    [
      ready,
      isAuthenticated,
      user,
      parishSource,
      parishLoading,
      parishError,
    ],
  );

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(live);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingDigest, setSavingDigest] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [emailDigest, setEmailDigest] = useState(true);
  const [digestLive, setDigestLive] = useState(false);
  const [sessions, setSessions] = useState<readonly UserSession[]>(MOCK_USER_SESSIONS);
  const [sessionsSource, setSessionsSource] = useState<"preview" | "live" | "error">(
    live ? "live" : "preview",
  );
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(live);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [sessionConfirm, setSessionConfirm] = useState<SessionConfirm | null>(null);

  const resetPasswordForm = useCallback(() => {
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError(null);
  }, []);

  const reloadSessions = useCallback(() => {
    setLoadingSessions(true);
    setSessionsError(null);
    void fetchUserSessions().then((result) => {
      setLoadingSessions(false);
      if (!result.ok) {
        setSessions([]);
        setSessionsSource("error");
        setSessionsError(result.message);
        return;
      }
      setSessions(result.sessions);
      setSessionsSource(result.source === "live" ? "live" : "preview");
    });
  }, []);

  useEffect(() => {
    if (!live) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external profile bootstrap
    setLoadingProfile(true);
    void fetchUserProfile({
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDisplayName(result.profile.displayName);
      } else {
        setStatus(result.message);
      }
      setLoadingProfile(false);
    });

    void fetchNotificationPrefs().then((result) => {
      if (cancelled || !result.ok) return;
      setEmailDigest(result.prefs.emailDigest);
      setDigestLive(result.source === "live");
    });

    return () => {
      cancelled = true;
    };
  }, [live, user?.displayName, user?.email]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external sessions bootstrap
    reloadSessions();
  }, [reloadSessions]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.isCurrent),
    [sessions],
  );
  const otherSessions = useMemo(
    () => sessions.filter((session) => !session.isCurrent && session.status === "active"),
    [sessions],
  );

  async function runSessionConfirm(action: SessionConfirm["action"]) {
    setSessionConfirm(null);
    await action();
  }

  function confirmRevokeSession(session: UserSession) {
    const label = formatSessionLabel(session);
    setSessionConfirm({
      title: "Revoke session",
      message: `Sign out ${label} (signed in ${formatSessionRelativeTime(session.createdAt)})? That device will need to log in again.`,
      action: async () => {
        setRevokingSessionId(session.id);
        const result = await revokeUserSession(session.id);
        setRevokingSessionId(null);
        if (!result.ok) {
          setStatus(result.message);
          return;
        }
        setStatus(
          result.source === "live"
            ? result.message
            : "Session revoked locally (preview mode).",
        );
        if (result.source === "preview") {
          setSessions((prev) => prev.filter((row) => row.id !== session.id));
        } else {
          reloadSessions();
        }
      },
    });
  }

  function confirmRevokeOthers() {
    setSessionConfirm({
      title: "Sign out other devices",
      message: `Revoke ${String(otherSessions.length)} other active session(s)? Your current session stays signed in.`,
      action: async () => {
        setRevokingOthers(true);
        const result = await revokeOtherUserSessions();
        setRevokingOthers(false);
        if (!result.ok) {
          setStatus(result.message);
          return;
        }
        const count =
          result.source === "live" ? result.revokedCount : otherSessions.length;
        setStatus(
          result.source === "live"
            ? result.message || `Revoked ${String(count)} session(s).`
            : "Other sessions revoked locally (preview mode).",
        );
        if (result.source === "preview") {
          setSessions((prev) => prev.filter((row) => row.isCurrent));
        } else {
          reloadSessions();
        }
      },
    });
  }

  async function submitPasswordChange() {
    if (!currentPassword || !nextPassword) {
      setError("Current and new passwords are required.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (nextPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    const result = await changeUserPassword({
      currentPassword,
      newPassword: nextPassword,
      confirmPassword,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setStatus(result.message);
    setPasswordOpen(false);
    resetPasswordForm();
  }

  async function saveProfile() {
    setSavingProfile(true);
    setStatus(null);
    const result = await updateUserProfile({ displayName });
    setSavingProfile(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus(
      result.source === "live"
        ? "Profile saved."
        : "Profile saved locally (preview mode).",
    );
    if (result.source === "live") {
      await refresh();
    }
  }

  async function saveEmailDigest(next: boolean) {
    setEmailDigest(next);
    if (!live || !digestLive) return;

    setSavingDigest(true);
    const result = await updateNotificationPrefs({
      emailDigest: next,
      ocrJobAlerts: false,
      certificateAlerts: false,
    });
    setSavingDigest(false);
    if (!result.ok) {
      setEmailDigest(!next);
      setStatus(result.message);
    }
  }

  return (
    <PageLayout
      title="Account"
      description="Profile and security for your parish portal user."
    >
      <Stack gap="md" maw={640}>
        {live ? (
          <Text size="sm" c="dimmed">
            Live profile and notification settings load from OM account APIs when
            authenticated.
          </Text>
        ) : null}

        {pilotDiagnostics.length > 0 ? (
          <Card padding="lg" withBorder>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Session diagnostics
                </Title>
                <Badge size="sm" variant="light" color="blue">
                  Live pilot
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Operator verification — session church context and parish settings
                API. See docs/AUTH-PILOT-CHECKLIST.md.
              </Text>
              <Stack gap={4}>
                {pilotDiagnostics.map((line) => (
                  <Group key={line.label} gap="xs" wrap="nowrap" align="flex-start">
                    {line.ok === true ? (
                      <Badge size="xs" color="green" variant="light">
                        ok
                      </Badge>
                    ) : line.ok === false ? (
                      <Badge size="xs" color="red" variant="light">
                        check
                      </Badge>
                    ) : (
                      <Badge size="xs" color="gray" variant="light">
                        info
                      </Badge>
                    )}
                    <Text size="sm">
                      <Text span fw={500}>
                        {line.label}:{" "}
                      </Text>
                      {line.value}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Card>
        ) : null}

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Profile
            </Title>
            <TextField
              label="Display name"
              value={displayName}
              onValueChange={setDisplayName}
              isDisabled={loadingProfile || savingProfile}
            />
            <Text size="sm">
              <Text span fw={500}>
                Email:{" "}
              </Text>
              {user?.email ?? "—"}
            </Text>
            <Text size="sm">
              <Text span fw={500}>
                Role:{" "}
              </Text>
              {user?.role ?? "—"}
            </Text>
            <Text size="sm" c="dimmed">
              Parish: {user?.churchId != null && live ? "from live church context" : parish.name}
            </Text>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Save profile"
              isDisabled={loadingProfile || savingProfile}
              isPending={savingProfile}
              onAction={() => void saveProfile()}
            >
              Save profile
            </Button>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Notifications
            </Title>
            <Switch
              isSelected={emailDigest}
              onSelectionChange={(isSelected) => void saveEmailDigest(isSelected)}
              isDisabled={savingDigest}
            >
              Email digest for parish activity
            </Switch>
            <Text size="sm" c="dimmed">
              {digestLive
                ? "Weekly digest preference persists via /api/notifications/preferences."
                : live
                  ? "Could not load live digest preference; using local toggle."
                  : "Preview mode — digest toggle is local only."}
            </Text>
            <Text size="sm">
              More notification controls live under{" "}
              <Link to="/settings/preferences">Preferences</Link>.
            </Text>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Parish administration
            </Title>
            <List size="sm" spacing={4}>
              <List.Item>
                <Link to="/settings/parish">Parish details</Link>
              </List.Item>
              <List.Item>
                <Link to="/settings/users">Parish users</Link>
              </List.Item>
              <List.Item>
                <Link to="/settings/preferences">OCR & notification preferences</Link>
              </List.Item>
              <List.Item>
                <Link to={onboarding.cta.href}>{onboarding.cta.label}</Link>
                {onboarding.cta.pending ? (
                  <Text size="xs" c="dimmed" mt={4}>
                    {onboarding.cta.stepNote}
                  </Text>
                ) : null}
              </List.Item>
            </List>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Security
            </Title>
            {status ? (
              <Text size="sm" role="status">
                {status}
              </Text>
            ) : null}
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Change password"
              onAction={() => setPasswordOpen(true)}
            >
              Change password
            </Button>
            <Dialog
              title="Change password"
              isOpen={passwordOpen}
              onOpenChange={(open) => {
                setPasswordOpen(open);
                if (!open) resetPasswordForm();
              }}
            >
              <Stack gap="md">
                {error ? (
                  <Text size="sm" c="red" role="alert">
                    {error}
                  </Text>
                ) : null}
                <TextField
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onValueChange={setCurrentPassword}
                  isRequired
                />
                <TextField
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={nextPassword}
                  onValueChange={setNextPassword}
                  isRequired
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  isRequired
                />
                <Button
                  className="om-btn-primary"
                  size="sm"
                  accessibleLabel="Save new password"
                  onAction={() => void submitPasswordChange()}
                >
                  Save password
                </Button>
              </Stack>
            </Dialog>

            <Divider my="xs" />

            <Title order={4} style={{ fontWeight: 500 }}>
              Active sessions
            </Title>
            <Text size="sm" c="dimmed">
              {sessionsSource === "live"
                ? "Sessions load from GET /api/user/sessions when authenticated."
                : sessionsSource === "preview"
                  ? "Preview mode — sample sessions; revoke actions are local only."
                  : "Could not load live sessions."}
            </Text>
            {sessionsError ? (
              <Text size="sm" c="red" role="alert">
                {sessionsError}
              </Text>
            ) : null}
            {loadingSessions ? (
              <Text size="sm" c="dimmed">
                Loading sessions…
              </Text>
            ) : (
              <Stack gap="sm">
                {currentSession ? (
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {formatSessionLabel(currentSession)}
                        </Text>
                        <Badge size="sm" color="blue" variant="light">
                          This device
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {maskSessionIp(currentSession.ipAddress)} · signed in{" "}
                        {formatSessionRelativeTime(currentSession.createdAt)}
                      </Text>
                    </Stack>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    Current session could not be identified.
                  </Text>
                )}

                {otherSessions.length > 0 ? (
                  <>
                    <Group justify="space-between" align="center">
                      <Text size="sm" fw={500}>
                        Other devices ({otherSessions.length})
                      </Text>
                      {otherSessions.length > 1 ? (
                        <Button
                          className="om-btn-ghost"
                          variant="secondary"
                          size="sm"
                          accessibleLabel="Sign out all other devices"
                          isDisabled={revokingSessionId !== null || revokingOthers}
                          isPending={revokingOthers}
                          onAction={() => confirmRevokeOthers()}
                        >
                          Sign out all others
                        </Button>
                      ) : null}
                    </Group>
                    <List size="sm" spacing="sm">
                      {otherSessions.map((session) => (
                        <List.Item key={session.id}>
                          <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Stack gap={2}>
                              <Text size="sm" fw={500}>
                                {formatSessionLabel(session)}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {maskSessionIp(session.ipAddress)} · signed in{" "}
                                {formatSessionRelativeTime(session.createdAt)}
                              </Text>
                            </Stack>
                            <Button
                              className="om-btn-ghost"
                              variant="secondary"
                              size="sm"
                              accessibleLabel={`Revoke session ${formatSessionLabel(session)}`}
                              isDisabled={revokingSessionId !== null || revokingOthers}
                              isPending={revokingSessionId === session.id}
                              onAction={() => confirmRevokeSession(session)}
                            >
                              Revoke
                            </Button>
                          </Group>
                        </List.Item>
                      ))}
                    </List>
                  </>
                ) : (
                  <Text size="sm" c="dimmed">
                    No other active sessions — only this device is signed in.
                  </Text>
                )}
              </Stack>
            )}

            <Dialog
              title={sessionConfirm?.title ?? "Confirm"}
              isOpen={sessionConfirm != null}
              onOpenChange={(open) => {
                if (!open) setSessionConfirm(null);
              }}
            >
              <Stack gap="md">
                <Text size="sm">{sessionConfirm?.message}</Text>
                <Group gap="sm">
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    accessibleLabel="Cancel session action"
                    onAction={() => setSessionConfirm(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="om-btn-primary"
                    size="sm"
                    accessibleLabel="Confirm session action"
                    onAction={() => {
                      if (sessionConfirm) void runSessionConfirm(sessionConfirm.action);
                    }}
                  >
                    Confirm
                  </Button>
                </Group>
              </Stack>
            </Dialog>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
