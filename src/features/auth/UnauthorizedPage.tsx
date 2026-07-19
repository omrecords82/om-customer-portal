import { Card, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { useNavigate } from "react-router";

import { AuthLayout } from "./AuthLayout";

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Not authorized"
      description="Your account does not have access to this Customer Portal area."
    >
      <Card padding="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Contact your church administrator if you believe this is a mistake.
          </Text>
          <Button
            className="om-btn-primary"
            accessibleLabel="Return to portal home"
            onAction={() => {
              void navigate("/");
            }}
          >
            Go to home
          </Button>
          <Button
            className="om-btn-ghost"
            variant="secondary"
            accessibleLabel="Sign in with a different account"
            onAction={() => {
              void navigate("/auth/login");
            }}
          >
            Sign in
          </Button>
        </Stack>
      </Card>
    </AuthLayout>
  );
}
