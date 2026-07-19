import "@mantine/core/styles.css";
import "@om/tokens/css";
import "@om/ui/css";
import "../styles/portal.css";

import { MantineProvider } from "@mantine/core";
import { createBrowserRouter, RouterProvider } from "react-router";
import { HelpCircle } from "lucide-react";

import { portalTheme } from "../theme/theme";
import { OmThemeSync } from "../theme/OmThemeSync";
import { PortalShell } from "../shell/PortalShell";
import { HomePage } from "../pages/HomePage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { portalBasePath } from "../config/basePath";
import { OnboardPage } from "../features/onboard/OnboardPage";
import { OcrMobilePage } from "../features/ocr-mobile/OcrMobilePage";
import { OcrDesktopPage } from "../features/ocr-desktop/OcrDesktopPage";
import { getNavItem } from "../config/navConfig";
import type { PortalHref } from "../config/navConfig";

function placeholderFor(href: PortalHref) {
  const item = getNavItem(href);
  if (!item) {
    throw new Error(`Missing nav config for ${href}`);
  }
  return (
    <PlaceholderPage
      title={item.title}
      description={item.description}
      icon={item.icon}
    />
  );
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <PortalShell />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "records", element: placeholderFor("/records") },
        { path: "ocr", element: <OcrDesktopPage /> },
        { path: "ocr/mobile", element: <OcrMobilePage /> },
        { path: "metrics", element: placeholderFor("/metrics") },
        { path: "cemetery", element: placeholderFor("/cemetery") },
        { path: "certificates", element: placeholderFor("/certificates") },
        { path: "onboarding", element: <OnboardPage /> },
        { path: "help", element: placeholderFor("/help") },
        { path: "account", element: placeholderFor("/account") },
        {
          path: "*",
          element: (
            <PlaceholderPage
              title="Page not found"
              description="That portal path does not exist. Use the sidebar to continue."
              icon={HelpCircle}
            />
          ),
        },
      ],
    },
  ],
  {
    basename: portalBasePath,
  },
);

export default function App() {
  return (
    <MantineProvider theme={portalTheme} defaultColorScheme="light">
      <OmThemeSync />
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
