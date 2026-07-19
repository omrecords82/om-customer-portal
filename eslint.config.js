import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const prohibitedLibrariesMessage =
  "Prohibited UI stack. Use Mantine for layout/surfaces and @om/ui for interactive controls.";

const reactAriaMessage =
  "Import interactive controls from @om/ui. Direct react-aria-components usage is allowlisted only where @om/ui lacks a required capability — see docs/om-package-integration.md.";

const legacyPortalMessage =
  "Do not import legacy Orthodox Metrics portal/front-end source into the Customer Portal.";

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "docs/**",
      "scripts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@mui/material",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@mui/icons-material",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@emotion/react",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@emotion/styled",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "tailwindcss",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "bootstrap",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@chakra-ui/react",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "antd",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "react-aria-components",
              message: reactAriaMessage,
            },
          ],
          patterns: [
            {
              group: ["@mui/*", "@emotion/*", "@radix-ui/*", "@chakra-ui/*"],
              message: prohibitedLibrariesMessage,
            },
            {
              group: ["**/orthodoxmetrics/prod/**", "**/front-end/src/features/portal/**"],
              message: legacyPortalMessage,
            },
            {
              group: ["shadcn", "shadcn/*", "@/components/ui/*"],
              message: prohibitedLibrariesMessage,
            },
          ],
        },
      ],
    },
  },
  {
    // Explicit allowlist: remaining direct RAC usage documented in
    // docs/om-package-integration.md. Tests may inspect RAC for integration checks.
    files: [
      "src/shell/PortalShell.tsx",
      "src/shell/Sidebar.tsx",
      "src/shell/TopHeader.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@mui/material",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@emotion/react",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@emotion/styled",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "tailwindcss",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "bootstrap",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "@chakra-ui/react",
              message: prohibitedLibrariesMessage,
            },
            {
              name: "antd",
              message: prohibitedLibrariesMessage,
            },
          ],
          patterns: [
            {
              group: ["@mui/*", "@emotion/*", "@radix-ui/*", "@chakra-ui/*"],
              message: prohibitedLibrariesMessage,
            },
            {
              group: ["**/orthodoxmetrics/prod/**", "**/front-end/src/features/portal/**"],
              message: legacyPortalMessage,
            },
            {
              group: ["shadcn", "shadcn/*", "@/components/ui/*"],
              message: prohibitedLibrariesMessage,
            },
          ],
        },
      ],
    },
  },
);
