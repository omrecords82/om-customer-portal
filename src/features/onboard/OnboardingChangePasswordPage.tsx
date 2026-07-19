import { Alert, Box, Card, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useState } from "react";
import { useNavigate } from "react-router";

import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { OnboardingWizardStepper } from "./OnboardingWizardStepper";
import { changeOnboardingPassword } from "./onboardWizardApi";

export function OnboardingChangePasswordPage() {
  const navigate = useNavigate();
  const live = authMode === "live";

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError(null);

    if (nextPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await changeOnboardingPassword({
        currentPassword,
        newPassword: nextPassword,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      void navigate(result.redirectTo, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLayout
      title="Set Your Password"
      description="First-login security step before record setup."
    >
      <Box maw={520} mx="auto">
        <Card withBorder padding="xl" style={{ borderTop: "4px solid var(--mantine-color-gold-5)" }}>
          <Stack gap="md">
            <OnboardingWizardStepper activeStep="password" />
            <Title order={3}>Change temporary password</Title>
            <Text size="sm" c="dimmed">
              For security, set a new password before continuing parish record setup.
            </Text>
            {!live ? (
              <Alert variant="light" color="blue">
                Preview mode — password change is saved on this device only.
              </Alert>
            ) : null}
            {error ? (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            ) : null}
            <form
              onSubmit={(event) => {
                void submit(event);
              }}
              className="om-auth-form"
            >
              <Stack gap="sm">
                <TextField
                  id="onboarding-current-password"
                  type="password"
                  label="Current temporary password"
                  isRequired
                  value={currentPassword}
                  onValueChange={setCurrentPassword}
                  autoComplete="current-password"
                  validationBehavior="aria"
                />
                <TextField
                  id="onboarding-new-password"
                  type="password"
                  label="New password"
                  isRequired
                  value={nextPassword}
                  onValueChange={setNextPassword}
                  autoComplete="new-password"
                  validationBehavior="aria"
                />
                <TextField
                  id="onboarding-confirm-password"
                  type="password"
                  label="Confirm new password"
                  isRequired
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  autoComplete="new-password"
                  validationBehavior="aria"
                />
                <Button type="submit" variant="primary" fullWidth isDisabled={busy} isPending={busy}>
                  Continue
                </Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </Box>
    </PageLayout>
  );
}
