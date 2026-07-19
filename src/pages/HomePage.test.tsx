/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router";

import { HomePage } from "./HomePage";
import { portalTheme } from "../theme/theme";

vi.mock("../auth/config", () => ({
  authMode: "mock",
  requireAuth: false,
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    ready: true,
    user: null,
    isAuthenticated: false,
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../features/hub/useHubDashboard", () => ({
  useHubDashboard: () => ({
    status: "ready",
    source: "preview",
    dashboard: null,
    certificatesIssued: null,
    partialErrors: [],
    activity: [],
  }),
}));

function renderHome() {
  return render(
    <MantineProvider theme={portalTheme}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows honest preview empty states and module cards", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: /parish dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Preview mode/i);
    expect(screen.getByText(/No recent activity yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming events/i)).toBeInTheDocument();
    expect(screen.getByText(/Parish modules/i)).toBeInTheDocument();
    expect(screen.getByText(/Lists load in preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Disabled by default/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /View help & site map/i }),
    ).toBeInTheDocument();
  });

  it("renders sacramental KPI placeholders without fake numbers", () => {
    renderHome();

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
    expect(
      screen.getByText(/^Sacramental totals when dashboard API connects$/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Monthly sacramental activity when dashboard API connects$/i),
    ).toBeInTheDocument();
  });
});
