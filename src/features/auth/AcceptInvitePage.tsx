import { Card, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { AuthLayout } from "./AuthLayout";

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function accept() {
    if (!token) {
      setError("Invite token is missing.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setDone(true);
  }

  return (
    <AuthLayout
      title="Accept invite"
      description="Set a password to join your parish Customer Portal."
    >
      <Card padding="lg">
        <Stack gap="md">
          {done ? (
            <>
              <Text size="sm" role="status">
                Invite accepted (mock). Sign in with your new password when live auth is enabled.
              </Text>
              <Button
                className="om-btn-primary"
                onAction={() => {
                  void navigate("/auth/login");
                }}
              >
                Go to sign in
              </Button>
            </>
          ) : (
            <>
              {error ? (
                <Text size="sm" c="red" role="alert">
                  {error}
                </Text>
              ) : null}
              <TextField
                label="Invite token"
                value={token}
                isReadOnly
                description="Provided in your invitation email."
              />
              <TextField
                label="New password"
                type="password"
                autoComplete="new-password"
                value={password}
                onValueChange={setPassword}
                isRequired
              />
              <TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onValueChange={setConfirm}
                isRequired
              />
              <Button className="om-btn-primary" onAction={accept}>
                Accept invite
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </AuthLayout>
  );
}
