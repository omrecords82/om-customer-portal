import "@mantine/core/styles.css";
import "@om/tokens/css";
import "@om/ui/css";
import "../styles/portal.css";

import { MantineProvider } from "@mantine/core";
import { createBrowserRouter, RouterProvider } from "react-router";
import {
  FileText,
  Upload,
  BarChart2,
  MapPin,
  Award,
  HelpCircle,
} from "lucide-react";

import { portalTheme } from "../theme/theme";
import { OmThemeSync } from "../theme/OmThemeSync";
import { PortalShell } from "../shell/PortalShell";
import { HomePage } from "../pages/HomePage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { portalBasePath } from "../config/basePath";

// ─── Router ───────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: "/",
    element: <PortalShell />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "records",
        element: (
          <PlaceholderPage
            title="Records"
            description="View and manage baptisms, marriages, chrismations, and other sacramental records."
            icon={FileText}
          />
        ),
      },
      {
        path: "ocr",
        element: (
          <PlaceholderPage
            title="OCR & Uploads"
            description="Upload and process scanned registry pages using optical character recognition."
            icon={Upload}
          />
        ),
      },
      {
        path: "metrics",
        element: (
          <PlaceholderPage
            title="Church Metrics"
            description="Membership trends, sacramental statistics, and parish growth over time."
            icon={BarChart2}
          />
        ),
      },
      {
        path: "cemetery",
        element: (
          <PlaceholderPage
            title="Cemetery"
            description="Manage cemetery plots, burial records, and interment documentation."
            icon={MapPin}
          />
        ),
      },
      {
        path: "certificates",
        element: (
          <PlaceholderPage
            title="Certificates"
            description="Issue and manage certificates of baptism, marriage, and chrismation."
            icon={Award}
          />
        ),
      },
      {
        path: "help",
        element: (
          <PlaceholderPage
            title="Help"
            description="Documentation, support resources, and contact information for Orthodox Metrics."
            icon={HelpCircle}
          />
        ),
      },
      {
        path: "account",
        element: (
          <PlaceholderPage
            title="My Account"
            description="Manage your profile, preferences, and account settings."
            icon={HelpCircle}
          />
        ),
      },
    ],
  },
], {
  basename: portalBasePath,
});

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <MantineProvider theme={portalTheme} defaultColorScheme="light">
      <OmThemeSync />
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
