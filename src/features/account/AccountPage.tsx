import { Card, List, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { TextField } from "@om/ui/text-field";
import { Dialog } from "@om/ui/dialog";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { parish } from "../../data/session";
import {
  changeUserPassword,
  fetchNotificationPrefs,
  fetchUserProfile,
  updateNotificationPrefs,
  updateUserProfile,
} from "../settings/settingsApi";

export function AccountPage() {
  const { user, refresh } = useAuth();
  const live = authMode === "live";

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

  const resetPasswordForm = useCallback(() => {
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError(null);
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
                <Link to="/onboarding">Portal onboarding checklist</Link>
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
            <Text size="sm" c="dimmed">
              Active sessions list / revoke-other-devices arrives with live auth
              session APIs.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
