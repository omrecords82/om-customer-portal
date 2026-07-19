import "@mantine/core/styles.css";
import "@om/tokens/css";
import "../styles/brand-bridge.css";
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
import { OnboardingChangePasswordPage } from "../features/onboard/OnboardingChangePasswordPage";
import { OnboardingRecordLayoutsPage } from "../features/onboard/OnboardingRecordLayoutsPage";
import { OnboardingRecordTablesPage } from "../features/onboard/OnboardingRecordTablesPage";
import { OcrMobilePage } from "../features/ocr-mobile/OcrMobilePage";
import { OcrDesktopPage } from "../features/ocr-desktop/OcrDesktopPage";
import { AccountPage } from "../features/account/AccountPage";
import { ParishSettingsPage } from "../features/settings/ParishSettingsPage";
import { ParishUsersPage } from "../features/settings/ParishUsersPage";
import { PreferencesPage } from "../features/settings/PreferencesPage";
import { HelpPage } from "../features/help/HelpPage";
import { RecordsPage } from "../features/records/RecordsPage";
import { CertificatesPage } from "../features/certificates/CertificatesPage";
import { CemeteryPage } from "../features/cemetery/CemeteryPage";
import { MetricsPage } from "../features/metrics/MetricsPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { UnauthorizedPage } from "../features/auth/UnauthorizedPage";
import { VerifyEmailPage } from "../features/auth/VerifyEmailPage";
import { AcceptInvitePage } from "../features/auth/AcceptInvitePage";
import { AuthProvider } from "../auth/AuthProvider";
import { RequireAuth } from "../auth/RequireAuth";
import { ParishProfileProvider } from "../shell/ParishProfileProvider";

const router = createBrowserRouter(
  [
    {
      path: "/auth/login",
      element: <LoginPage />,
    },
    {
      path: "/auth/forgot-password",
      element: <ForgotPasswordPage />,
    },
    {
      path: "/auth/unauthorized",
      element: <UnauthorizedPage />,
    },
    {
      path: "/auth/verify-email",
      element: <VerifyEmailPage />,
    },
    {
      path: "/auth/accept-invite",
      element: <AcceptInvitePage />,
    },
    {
      path: "/",
      element: (
        <RequireAuth>
          <PortalShell />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <HomePage /> },
        { path: "records", element: <RecordsPage /> },
        { path: "ocr", element: <OcrDesktopPage /> },
        { path: "ocr/mobile", element: <OcrMobilePage /> },
        { path: "metrics", element: <MetricsPage /> },
        { path: "cemetery", element: <CemeteryPage /> },
        { path: "certificates", element: <CertificatesPage /> },
        { path: "onboarding", element: <OnboardPage /> },
        { path: "onboarding/change-password", element: <OnboardingChangePasswordPage /> },
        { path: "onboarding/record-tables", element: <OnboardingRecordTablesPage /> },
        { path: "onboarding/record-layouts", element: <OnboardingRecordLayoutsPage /> },
        { path: "settings/parish", element: <ParishSettingsPage /> },
        { path: "settings/users", element: <ParishUsersPage /> },
        { path: "settings/preferences", element: <PreferencesPage /> },
        { path: "help", element: <HelpPage /> },
        { path: "account", element: <AccountPage /> },
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
      <AuthProvider>
        <ParishProfileProvider>
          <RouterProvider router={router} />
        </ParishProfileProvider>
      </AuthProvider>
    </MantineProvider>
  );
}
