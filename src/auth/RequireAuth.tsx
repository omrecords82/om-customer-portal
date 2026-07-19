import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

import { requireAuth } from "./config";
import { useAuth } from "./AuthProvider";
import { buildPortalReturnPath, loginPathWithNext } from "./safeNext";

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
    const next = buildPortalReturnPath(location);
    return <Navigate to={loginPathWithNext(next)} replace />;
  }

  return children;
}
