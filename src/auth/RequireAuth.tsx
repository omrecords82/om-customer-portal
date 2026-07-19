import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

import { requireAuth } from "./config";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const { ready, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!requireAuth) {
    return children;
  }

  if (!ready) {
    return null;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/auth/login?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return children;
}
