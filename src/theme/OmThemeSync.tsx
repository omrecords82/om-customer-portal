import { useComputedColorScheme } from "@mantine/core";
import { useEffect } from "react";

/**
 * Keep `@om/tokens` theme selectors (`[data-om-theme]`) aligned with
 * Mantine's resolved light/dark scheme so OM CSS variables resolve.
 */
export function OmThemeSync() {
  const colorScheme = useComputedColorScheme("light");

  useEffect(() => {
    document.documentElement.dataset.omTheme =
      colorScheme === "dark" ? "dark" : "light";
  }, [colorScheme]);

  return null;
}
