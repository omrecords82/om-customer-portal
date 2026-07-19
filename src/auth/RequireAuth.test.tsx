/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

const authConfig = vi.hoisted(() => ({
  requireAuth: true,
}));

vi.mock("./config", () => ({
  get requireAuth() {
    return authConfig.requireAuth;
  },
}));

vi.mock("./AuthProvider", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "./AuthProvider";
import { RequireAuth } from "./RequireAuth";
import { getSafePortalNext } from "./safeNext";

const mockedUseAuth = vi.mocked(useAuth);

function LocationProbe({ label }: { readonly label: string }) {
  const location = useLocation();
  return (
    <div data-testid={`probe-${label}`}>
      <span>{label}</span>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
    </div>
  );
}

function renderGate(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/auth/login"
          element={<LocationProbe label="login" />}
        />
        <Route
          path="/records"
          element={
            <RequireAuth>
              <LocationProbe label="records" />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <LocationProbe label="home" />
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authConfig.requireAuth = true;
  });

  it("renders children when requireAuth is false", () => {
    authConfig.requireAuth = false;
    mockedUseAuth.mockReturnValue({
      ready: true,
      isAuthenticated: false,
      user: null,
      refresh: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderGate("/records?type=baptism");

    const probe = screen.getByTestId("probe-records");
    expect(within(probe).getByText("records")).toBeInTheDocument();
    expect(within(probe).getByTestId("search")).toHaveTextContent(
      "?type=baptism",
    );
    expect(screen.queryByTestId("probe-login")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users with nested next= encoding", () => {
    authConfig.requireAuth = true;
    mockedUseAuth.mockReturnValue({
      ready: true,
      isAuthenticated: false,
      user: null,
      refresh: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderGate("/records?type=baptism");

    const probe = screen.getByTestId("probe-login");
    expect(within(probe).getByTestId("path")).toHaveTextContent("/auth/login");
    expect(within(probe).getByTestId("search")).toHaveTextContent(
      `?next=${encodeURIComponent("/records?type=baptism")}`,
    );
    expect(
      getSafePortalNext(
        `next=${encodeURIComponent("/records?type=baptism")}`,
      ),
    ).toBe("/records?type=baptism");
    expect(screen.queryByTestId("probe-records")).not.toBeInTheDocument();
  });

  it("renders children when authenticated and requireAuth is true", () => {
    authConfig.requireAuth = true;
    mockedUseAuth.mockReturnValue({
      ready: true,
      isAuthenticated: true,
      user: {
        id: 1,
        email: "pilot@example.com",
        displayName: "Pilot User",
        role: "church_admin",
        initials: "PU",
        churchId: 46,
      },
      refresh: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderGate("/records?type=baptism");

    expect(screen.getByTestId("probe-records")).toBeInTheDocument();
    expect(screen.queryByTestId("probe-login")).not.toBeInTheDocument();
  });

  it("renders nothing while auth is not ready under requireAuth", () => {
    authConfig.requireAuth = true;
    mockedUseAuth.mockReturnValue({
      ready: false,
      isAuthenticated: false,
      user: null,
      refresh: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = renderGate("/records?type=baptism");
    expect(container.textContent).toBe("");
  });
});
