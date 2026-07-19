import { Card, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { useNavigate, useSearchParams } from "react-router";

import { AuthLayout } from "./AuthLayout";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <AuthLayout
      title="Verify email"
      description="Confirm your email address to finish activating your portal account."
    >
      <Card padding="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {token
              ? "Verification token detected. Live confirmation posts to /api/auth/verify-email."
              : "Open the link from your email, or request a new verification message from support."}
          </Text>
          <Button
            className="om-btn-primary"
            accessibleLabel="Continue to sign in"
            onAction={() => {
              void navigate("/auth/login");
            }}
          >
            Continue to sign in
          </Button>
        </Stack>
      </Card>
    </AuthLayout>
  );
}
