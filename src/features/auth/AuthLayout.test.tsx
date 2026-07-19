/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router";

import { AuthLayout } from "./AuthLayout";
import { portalTheme } from "../../theme/theme";

vi.mock("../../shell/ParishProfileProvider", () => ({
  useParishProfile: () => ({
    profile: {
      shortName: "St. Demo",
      name: "St. Demo Orthodox Church",
      location: "Demo City, ST",
      diocese: "Demo Diocese",
    },
    note: null,
    source: "preview",
    error: null,
  }),
}));

function renderAuthLayout() {
  return render(
    <MantineProvider theme={portalTheme}>
      <MemoryRouter>
        <AuthLayout title="Sign in" description="Access the Customer Portal.">
          <p>Form content</p>
        </AuthLayout>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("AuthLayout a11y", () => {
  afterEach(() => {
    cleanup();
  });

  it("exposes skip link and focusable main landmark", () => {
    renderAuthLayout();

    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute(
      "href",
      "#portal-main",
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "portal-main");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("sets the document title from the auth screen title", () => {
    renderAuthLayout();
    expect(document.title).toBe("Sign in · Orthodox Metrics Portal");
  });
});
