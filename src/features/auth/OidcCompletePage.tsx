import { Card, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { checkSession } from "../../auth/authApi";
import { getSafePortalNext } from "../../auth/safeNext";
import { AuthLayout } from "./AuthLayout";

const POST_LOGIN_NEXT_KEY = "om_portal2_post_login_next";

/** Persist OM JWT after Keycloak credentials grant redirect (live pilot). */
export function OidcCompletePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken) {
      setError("Missing access token. Try signing in again.");
      return;
    }

    let cancelled = false;

    void (async () => {
      localStorage.setItem("access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      const user = await checkSession();
      if (!user) {
        if (!cancelled) {
          setError("Sign-in token was not accepted by the API. Try signing in again.");
        }
        return;
      }

      if (cancelled) return;

      const storedNext = sessionStorage.getItem(POST_LOGIN_NEXT_KEY);
      sessionStorage.removeItem(POST_LOGIN_NEXT_KEY);
      const fromQuery = getSafePortalNext(params.toString(), "/");
      const dest = storedNext
        ? getSafePortalNext(`?next=${encodeURIComponent(storedNext)}`, "/")
        : fromQuery;

      void navigate(dest, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  if (error) {
    return (
      <AuthLayout title="Sign in" description="Could not complete sign-in.">
        <Card padding="lg">
          <Stack gap="md">
            <Text size="sm" c="red" role="alert">
              {error}
            </Text>
          </Stack>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign in" description="Completing sign-in…">
      <Card padding="lg">
        <Stack align="center" gap="sm">
          <Loader size="sm" aria-label="Loading" />
          <Text size="sm" c="dimmed">
            Signing you in…
          </Text>
        </Stack>
      </Card>
    </AuthLayout>
  );
}

export function rememberPortalPostLoginNext(nextAppPath: string): void {
  sessionStorage.setItem(POST_LOGIN_NEXT_KEY, nextAppPath);
}
