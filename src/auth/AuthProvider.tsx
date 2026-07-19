import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { checkSession, loginWithCredentials, logoutSession } from "./authApi";
import { authMode, requireAuth } from "./config";
import type { LoginCredentials, LoginResult, PortalUser } from "./types";

type AuthContextValue = {
  readonly ready: boolean;
  readonly user: PortalUser | null;
  readonly isAuthenticated: boolean;
  readonly refresh: () => Promise<void>;
  readonly login: (
    credentials: LoginCredentials,
    nextAppPath: string,
  ) => Promise<LoginResult>;
  readonly logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PortalUser | null>(null);

  const refresh = useCallback(async () => {
    const next = await checkSession();
    setUser(next);
    setReady(true);
  }, []);

  useEffect(() => {
    // Session bootstrap from cookie / mock storage — external system sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional auth bootstrap
    void refresh();
  }, [refresh]);

  // Live pilot: periodic session check for expiry while requireAuth is on.
  useEffect(() => {
    if (authMode !== "live" || !requireAuth) return;
    const id = window.setInterval(() => {
      void checkSession().then((next) => {
        setUser(next);
        if (!next) setReady(true);
      });
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials, nextAppPath: string) => {
      const result = await loginWithCredentials(credentials, nextAppPath);
      if (result.kind === "authenticated") {
        setUser(result.user);
      }
      return result;
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      isAuthenticated: user !== null,
      refresh,
      login,
      logout,
    }),
    [ready, user, refresh, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
