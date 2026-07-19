import { Card, Loader, Stack, Text } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Checkbox } from "@om/ui/checkbox";
import { TextField } from "@om/ui/text-field";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

import { useAuth } from "../../auth/AuthProvider";
import { getSafePortalNext } from "../../auth/safeNext";
import { fetchAuthenticatedDestination } from "../onboard/onboardPresentation";
import { AuthLayout } from "./AuthLayout";

function AuthenticatedLoginRedirect({ nextPath }: { readonly nextPath: string }) {
  const [dest, setDest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAuthenticatedDestination(nextPath).then((resolved) => {
      if (!cancelled) setDest(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  if (dest === null) {
    return (
      <AuthLayout title="Sign in" description="Checking onboarding status…">
        <Card padding="lg">
          <Stack align="center" gap="sm">
            <Loader size="sm" aria-label="Loading" />
            <Text size="sm" c="dimmed">
              Redirecting…
            </Text>
          </Stack>
        </Card>
      </AuthLayout>
    );
  }

  return <Navigate to={dest} replace />;
}

export function LoginPage() {
  const { login, isAuthenticated, ready } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = getSafePortalNext(params.toString(), "/");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (ready && isAuthenticated) {
    return <AuthenticatedLoginRedirect nextPath={nextPath} />;
  }

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    let valid = true;
    if (!username.trim()) {
      setUsernameError("Email is required.");
      valid = false;
    } else {
      setUsernameError(null);
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError(null);
    }
    if (!valid) return;

    setPending(true);
    setFormError(null);
    try {
      const result = await login(
        {
          username,
          password,
          rememberMe,
        },
        nextPath,
      );

      if (result.kind === "authenticated") {
        const dest = await fetchAuthenticatedDestination(nextPath);
        void navigate(dest, { replace: true });
        return;
      }
      if (result.kind === "redirect") {
        window.location.assign(result.url);
        return;
      }
      if (result.kind === "mfa_setup") {
        window.location.assign(result.setupUrl);
        return;
      }
      setFormError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Access the Customer Portal. Pilot tenants stay on /portal2 after login."
    >
      <Card
        padding="lg"
        component="form"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <Stack gap="md">
          {formError ? (
            <Text size="sm" c="red" role="alert">
              {formError}
            </Text>
          ) : null}

          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={username}
            onValueChange={(value) => {
              setUsername(value);
              if (usernameError) setUsernameError(null);
            }}
            isRequired
            isInvalid={Boolean(usernameError)}
            {...(usernameError ? { errorMessage: usernameError } : {})}
          />

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError(null);
            }}
            isRequired
            isInvalid={Boolean(passwordError)}
            {...(passwordError ? { errorMessage: passwordError } : {})}
          />

          <Checkbox
            isSelected={rememberMe}
            onSelectionChange={setRememberMe}
          >
            Remember this device
          </Checkbox>

          <Button
            className="om-btn-primary"
            type="submit"
            isDisabled={pending}
            accessibleLabel="Sign in"
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <Text size="sm">
            <Link to="/auth/forgot-password">Forgot password?</Link>
          </Text>
        </Stack>
      </Card>
    </AuthLayout>
  );
}
