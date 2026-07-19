import { Card, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { Dialog } from "@om/ui/dialog";
import { useState } from "react";

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
    // API seam: Wave B live mode will POST /api/auth/change-password
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
            <Text size="sm">
              <Text span fw={500}>
                Name:{" "}
              </Text>
              {user?.displayName ?? "—"}
            </Text>
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
              Session list / revoke-other-devices arrives with live auth APIs.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
