import { describe, expect, it } from "vitest";

import { DEFAULT_PARISH } from "../features/settings/settingsData";
import {
  parishChromeFromFetchResult,
  parishChromeNote,
} from "./parishProfileState";

describe("parishProfileState", () => {
  it("uses preview defaults when live fetch is not eligible", () => {
    expect(
      parishChromeFromFetchResult(false, {
        ok: true,
        source: "live",
        profile: {
          ...DEFAULT_PARISH,
          name: "Live Church",
        },
        editable: true,
      }),
    ).toEqual({
      profile: DEFAULT_PARISH,
      source: "preview",
      error: null,
    });
  });

  it("maps successful live fetch to live chrome", () => {
    const liveProfile = {
      ...DEFAULT_PARISH,
      name: "Holy Trinity Orthodox Church",
      shortName: "Holy Trinity",
    };
    expect(
      parishChromeFromFetchResult(true, {
        ok: true,
        source: "live",
        profile: liveProfile,
        editable: false,
      }),
    ).toEqual({
      profile: liveProfile,
      source: "live",
      error: null,
    });
  });

  it("falls back to preview defaults when live fetch fails", () => {
    expect(
      parishChromeFromFetchResult(true, {
        ok: false,
        message: "Parish settings unavailable (401).",
        status: 401,
      }),
    ).toEqual({
      profile: DEFAULT_PARISH,
      source: "fallback",
      error: "Parish settings unavailable (401).",
    });
  });

  it("labels preview and fallback shell notes honestly", () => {
    expect(parishChromeNote("preview", null)).toMatch(/preview parish identity/i);
    expect(parishChromeNote("live", null)).toBeNull();
    expect(parishChromeNote("fallback", "Network error.")).toMatch(
      /network error.*preview parish defaults/i,
    );
  });
});
