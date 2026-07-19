import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;

  return withLeadingSlash.replace(/\/+$/, "");
}

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",

    resolveId(id: string) {
      if (!id.startsWith("figma:asset/")) {
        return undefined;
      }

      const filename = id.replace("figma:asset/", "");

      return fileURLToPath(
        new URL(`./src/assets/${filename}`, import.meta.url),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(
    env.VITE_PORTAL_BASE_PATH ?? "/portal2",
  );

  return {
    base: basePath === "/" ? "/" : `${basePath}/`,

    plugins: [
      figmaAssetResolver(),
      react(),
    ],

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    assetsInclude: ["**/*.svg", "**/*.csv"],

    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
  };
});
