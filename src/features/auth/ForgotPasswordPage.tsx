import { Card, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useState } from "react";
import { Link } from "react-router";

import { requestPasswordReset } from "../../auth/authApi";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      description="We will email reset instructions when your account is found."
    >
      <Card
        padding="lg"
        component="form"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <Stack gap="md">
          {sent ? (
            <Text size="sm" role="status">
              If an account exists for that email, reset instructions are on the way.
            </Text>
          ) : (
            <>
              {error ? (
                <Text size="sm" c="red" role="alert">
                  {error}
                </Text>
              ) : null}
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onValueChange={setEmail}
                isRequired
              />
              <Button
                className="om-btn-primary"
                type="submit"
                isDisabled={pending}
                accessibleLabel="Send reset link"
              >
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </>
          )}
          <Text size="sm">
            <Link to="/auth/login">Back to sign in</Link>
          </Text>
        </Stack>
      </Card>
    </AuthLayout>
  );
}
