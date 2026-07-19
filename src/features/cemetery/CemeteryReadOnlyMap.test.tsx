/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MOCK_CEMETERY_PLOTS,
  MOCK_RENDER_GEOMETRY,
} from "./cemeteryApi";
import { CemeteryReadOnlyMap } from "./CemeteryReadOnlyMap";
import { portalTheme } from "../../theme/theme";

vi.mock("@om/ui/button", () => ({
  Button: ({
    children,
    accessibleLabel,
    onAction,
    isDisabled,
  }: {
    children: React.ReactNode;
    accessibleLabel?: string;
    onAction?: () => void;
    isDisabled?: boolean;
  }) => (
    <button
      type="button"
      aria-label={accessibleLabel}
      disabled={isDisabled}
      onClick={() => {
        onAction?.();
      }}
    >
      {children}
    </button>
  ),
}));

describe("CemeteryReadOnlyMap", () => {
  afterEach(() => {
    cleanup();
  });

  function renderMap(props: ComponentProps<typeof CemeteryReadOnlyMap>) {
    return render(
      <MantineProvider theme={portalTheme}>
        <CemeteryReadOnlyMap {...props} />
      </MantineProvider>,
    );
  }

  it("shows an error panel when geometry failed to load", () => {
    renderMap({
      plots: MOCK_CEMETERY_PLOTS,
      geometry: null,
      selectedPlotId: null,
      onSelectPlot: vi.fn(),
      errorMessage: "Map geometry unavailable (503).",
    });
    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    expect(screen.getByText("Map geometry unavailable (503).")).toBeInTheDocument();
  });

  it("renders plot markers and status legend when coords exist", () => {
    renderMap({
      plots: MOCK_CEMETERY_PLOTS,
      geometry: MOCK_RENDER_GEOMETRY,
      selectedPlotId: "p1",
      onSelectPlot: vi.fn(),
    });
    expect(screen.getByRole("img", { name: /cemetery plot map/i })).toBeInTheDocument();
    expect(screen.getByText("Occupied")).toBeInTheDocument();
    expect(screen.getByText(/Selected: Section A, lot 12/i)).toBeInTheDocument();
  });

  it("shows empty-state copy when no plots have map coordinates", () => {
    const plot = MOCK_CEMETERY_PLOTS[0];
    if (!plot) throw new Error("missing mock plot");
    renderMap({
      plots: [{ ...plot, mapX: null, mapY: null }],
      geometry: MOCK_RENDER_GEOMETRY,
      selectedPlotId: null,
      onSelectPlot: vi.fn(),
    });
    expect(screen.getByText("No mappable plots")).toBeInTheDocument();
  });
});
