/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { portalTheme } from "../../theme/theme";
import { OcrMobilePage } from "./OcrMobilePage";

function renderPage() {
  return render(
    <MantineProvider theme={portalTheme}>
      <AuthProvider>
        <OcrMobilePage />
      </AuthProvider>
    </MantineProvider>,
  );
}

function clickFirst(name: RegExp) {
  const match = screen.getAllByRole("button", { name })[0];
  if (!match) throw new Error(`No button matching ${name.source}`);
  return match;
}

describe("OcrMobilePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("advances from connect to capture", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { name: /connect this device/i })).toBeInTheDocument();
    await user.click(clickFirst(/^continue$/i));
    expect(screen.getByRole("heading", { name: /capture pages/i })).toBeInTheDocument();
  });

  it("shows honest OCR preview copy and failed-upload retry in mock mode", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(clickFirst(/^continue$/i));
    expect(
      screen.getAllByRole("button", { name: /retry failed uploads/i }).length,
    ).toBeGreaterThan(0);

    await user.click(clickFirst(/review \(\d+ warnings\)/i));
    await user.click(clickFirst(/submit for ocr/i));

    expect(screen.getByRole("heading", { name: /ocr processing/i })).toBeInTheDocument();
    expect(screen.getByText(/preview checklist/i)).toBeInTheDocument();
    expect(screen.queryByText(/wave b/i)).not.toBeInTheDocument();
  });
});
