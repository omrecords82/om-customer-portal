/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router";

import { SkipToContentLink } from "./SkipToContentLink";
import { portalTheme } from "../theme/theme";

describe("SkipToContentLink", () => {
  afterEach(() => {
    cleanup();
  });

  it("targets the portal main landmark", () => {
    render(
      <MantineProvider theme={portalTheme}>
        <MemoryRouter>
          <SkipToContentLink />
          <main id="portal-main" tabIndex={-1}>
            Content
          </main>
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute(
      "href",
      "#portal-main",
    );
  });
});
