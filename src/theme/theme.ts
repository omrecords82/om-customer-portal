import { createTheme, rem } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

const navy: MantineColorsTuple = [
  "#eef1f7",
  "#d5dce9",
  "#b3c0d5",
  "#8da3c0",
  "#6683a8",
  "#456393",
  "#2b4c7e",
  "#1b2d4f",
  "#142240",
  "#0e1830",
];

const gold: MantineColorsTuple = [
  "#fbf5e0",
  "#f4e6b0",
  "#edd77e",
  "#e6c84c",
  "#dfb91a",
  "#c9a84c",
  "#b08a2e",
  "#8a6c1a",
  "#644e06",
  "#3e3000",
];

export const portalTheme = createTheme({
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'Courier New', monospace",

  headings: {
    fontFamily: "'Crimson Pro', Georgia, 'Times New Roman', serif",
    fontWeight: "500",
    sizes: {
      h1: { fontSize: rem(26), lineHeight: "1.3" },
      h2: { fontSize: rem(21), lineHeight: "1.35" },
      h3: { fontSize: rem(17), lineHeight: "1.4" },
      h4: { fontSize: rem(15), lineHeight: "1.4" },
    },
  },

  primaryColor: "navy",
  defaultRadius: "sm",
  colors: { navy, gold },

  spacing: {
    xs: rem(6),
    sm: rem(10),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(6),
    lg: rem(8),
    xl: rem(12),
  },

  shadows: {
    xs: "0 1px 2px rgba(0,0,0,0.05)",
    sm: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 2px 8px rgba(0,0,0,0.08)",
    lg: "0 4px 16px rgba(0,0,0,0.10)",
    xl: "0 8px 24px rgba(0,0,0,0.12)",
  },

  components: {
    Card: {
      defaultProps: { withBorder: true, radius: "sm", padding: "md" },
    },
  },
});
