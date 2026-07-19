import { describe, expect, it } from "vitest";

import {
  DEFAULT_CEMETERY_FLAGS,
  canShowCemeteryMap,
  resolveCemeteryFlags,
} from "./cemeteryFlags";

describe("cemeteryFlags", () => {
  it("defaults all flags off", () => {
    expect(DEFAULT_CEMETERY_FLAGS).toEqual({
      enabled: false,
      mapEnabled: false,
      maintenanceEnabled: false,
      reportsEnabled: false,
    });
    expect(canShowCemeteryMap(DEFAULT_CEMETERY_FLAGS)).toBe(false);
  });

  it("applies church overrides without hard-coding church ids", () => {
    const flags = resolveCemeteryFlags({
      churchOverrides: { enabled: true, mapEnabled: true },
    });
    expect(flags.enabled).toBe(true);
    expect(flags.mapEnabled).toBe(true);
    expect(flags.maintenanceEnabled).toBe(false);
    expect(canShowCemeteryMap(flags)).toBe(true);
  });
});
