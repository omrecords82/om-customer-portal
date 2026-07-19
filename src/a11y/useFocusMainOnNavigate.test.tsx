/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { useEffect } from "react";

import { useFocusMainOnNavigate } from "./useFocusMainOnNavigate";

function FocusHarness() {
  useFocusMainOnNavigate();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void navigate("/records");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main id="portal-main" tabIndex={-1} data-testid="main">
      Main
    </main>
  );
}

describe("useFocusMainOnNavigate", () => {
  afterEach(() => {
    cleanup();
  });

  it("moves focus to the main landmark after route changes", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<FocusHarness />} />
          <Route path="/records" element={<FocusHarness />} />
        </Routes>
      </MemoryRouter>,
    );

    const main = document.getElementById("portal-main");
    expect(main).toBeTruthy();
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(main);
    });
  });
});
