/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { OnboardPage } from "./OnboardPage";
import { portalTheme } from "../../theme/theme";

describe("OnboardPage", () => {
  it("renders portal preparation copy and steps", () => {
    render(
      <MantineProvider theme={portalTheme}>
        <OnboardPage />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: /preparing your church portal/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /onboarding steps/i })).toBeInTheDocument();
    expect(screen.getByText(/Preparing Church Profile/i)).toBeInTheDocument();
  });
});
