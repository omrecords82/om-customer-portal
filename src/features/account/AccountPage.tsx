import { Card, List, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { TextField } from "@om/ui/text-field";
import { Dialog } from "@om/ui/dialog";
import { useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { PageLayout } from "../../components/PageLayout";
import { parish } from "../../data/session";

export function AccountPage() {
  const { user } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [emailDigest, setEmailDigest] = useState(true);

  function resetPasswordForm() {
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function submitPasswordChange() {
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
    setStatus("Password change recorded locally (mock). Wire live API next.");
    setPasswordOpen(false);
    resetPasswordForm();
  }

  return (
    <PageLayout
      title="Account"
      description="Profile and security for your parish portal user."
    >
      <Stack gap="md" maw={640}>
        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Profile
            </Title>
            <TextField
              label="Display name"
              value={displayName}
              onValueChange={setDisplayName}
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
              Parish: {parish.name}
            </Text>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              accessibleLabel="Save profile"
              onAction={() =>
                setStatus("Profile saved locally (mock). Persist with Wave C APIs.")
              }
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
            <Switch isSelected={emailDigest} onSelectionChange={setEmailDigest}>
              Email digest for parish activity
            </Switch>
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
                  onAction={submitPasswordChange}
                >
                  Save password
                </Button>
              </Stack>
            </Dialog>
            <Text size="sm" c="dimmed">
              Active sessions list / revoke-other-devices arrives with live auth APIs.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
