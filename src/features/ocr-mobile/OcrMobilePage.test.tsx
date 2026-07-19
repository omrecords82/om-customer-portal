/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { OcrMobilePage } from "./OcrMobilePage";
import { portalTheme } from "../../theme/theme";

describe("OcrMobilePage", () => {
  it("advances from connect to capture", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={portalTheme}>
        <OcrMobilePage />
      </MantineProvider>,
    );

    expect(screen.getByRole("heading", { name: /connect this device/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: /capture pages/i })).toBeInTheDocument();
  });
});
