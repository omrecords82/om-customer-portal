/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { portalTheme } from "../../theme/theme";
import { OcrMobilePage } from "./OcrMobilePage";

vi.mock("../ocr-desktop/ocrApi", async () => {
  const actual = await vi.importActual<typeof import("../ocr-desktop/ocrApi")>(
    "../ocr-desktop/ocrApi",
  );
  return {
    ...actual,
    uploadOcrJobPages: vi.fn(),
    fetchChurchOcrJobs: vi.fn(),
    retryChurchOcrJob: vi.fn(),
    seedChurchOcrJob: vi.fn(),
  };
});

beforeAll(() => {
  class ResizeObserverStub {
    observe(): void {
      /* jsdom */
    }
    unobserve(): void {
      /* jsdom */
    }
    disconnect(): void {
      /* jsdom */
    }
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
});

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
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^capture$/i })).toBeInTheDocument();
  });

  it("shows honest OCR preview copy and failed-upload retry in mock mode", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(clickFirst(/^continue$/i));
    expect(
      screen.getByText(/preview capture/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /retry failed uploads/i }).length,
    ).toBeGreaterThan(0);

    await user.click(clickFirst(/review \(\d+ warnings\)/i));
    await user.click(clickFirst(/submit for ocr/i));

    expect(screen.getByRole("heading", { name: /ocr processing/i })).toBeInTheDocument();
    expect(screen.getByText(/preview checklist/i)).toBeInTheDocument();
    expect(screen.queryByText(/wave b/i)).not.toBeInTheDocument();
  });

  it("surfaces permission-denied connect copy after camera request fails", async () => {
    const user = userEvent.setup();
    const getUserMedia = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    renderPage();
    await user.click(clickFirst(/request camera/i));
    expect(
      screen.getByText(/camera permission is required/i),
    ).toBeInTheDocument();
  });
});
