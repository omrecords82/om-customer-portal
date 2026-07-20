import type { ElementType } from "react";
import {
  Home,
  FileText,
  Upload,
  Smartphone,
  BarChart2,
  MapPin,
  Award,
  HelpCircle,
  Church,
  Settings,
  Users,
  SlidersHorizontal,
} from "lucide-react";

export type PortalHref =
  | "/"
  | "/records"
  | "/ocr"
  | "/ocr/mobile"
  | "/ocr/settings"
  | "/metrics"
  | "/cemetery"
  | "/certificates"
  | "/help"
  | "/account"
  | "/onboarding"
  | "/settings/parish"
  | "/settings/users"
  | "/settings/preferences"
  | "/settings/record-fields";

export type PortalNavItem = {
  readonly href: PortalHref;
  readonly label: string;
  readonly icon: ElementType;
  readonly title: string;
  readonly description: string;
  readonly showInSidebar?: boolean;
};

export const PORTAL_NAV: readonly PortalNavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    title: "Home",
    description: "Parish dashboard and recent activity.",
    showInSidebar: true,
  },
  {
    href: "/records",
    label: "Records",
    icon: FileText,
    title: "Records",
    description:
      "View and manage baptisms, marriages, chrismations, and other sacramental records.",
    showInSidebar: true,
  },
  {
    href: "/ocr",
    label: "OCR & Uploads",
    icon: Upload,
    title: "OCR Desktop",
    description:
      "Desktop batch upload and OCR processing for sacramental registry pages.",
    showInSidebar: true,
  },
  {
    href: "/ocr/mobile",
    label: "OCR Mobile",
    icon: Smartphone,
    title: "OCR Mobile",
    description: "Mobile capture workflow for registry page uploads.",
    showInSidebar: true,
  },
  {
    href: "/ocr/settings",
    label: "OCR settings",
    icon: SlidersHorizontal,
    title: "OCR settings",
    description: "Rules engine, parish clergy, locations, and document retention.",
    showInSidebar: true,
  },
  {
    href: "/metrics",
    label: "Church Metrics",
    icon: BarChart2,
    title: "Church Metrics",
    description: "Membership trends, sacramental statistics, and parish growth over time.",
    showInSidebar: true,
  },
  {
    href: "/cemetery",
    label: "Cemetery",
    icon: MapPin,
    title: "Cemetery",
    description: "Manage cemetery plots, burial records, and interment documentation.",
    showInSidebar: true,
  },
  {
    href: "/certificates",
    label: "Certificates",
    icon: Award,
    title: "Certificates",
    description: "Issue and manage certificates of baptism, marriage, and reception.",
    showInSidebar: true,
  },
  {
    href: "/onboarding",
    label: "Onboarding",
    icon: Church,
    title: "Portal Onboarding",
    description: "Church portal preparation and provisioning status.",
    showInSidebar: true,
  },
  {
    href: "/settings/parish",
    label: "Parish settings",
    icon: Settings,
    title: "Parish settings",
    description: "Church identity and contact details.",
    showInSidebar: true,
  },
  {
    href: "/settings/users",
    label: "Parish users",
    icon: Users,
    title: "Parish users",
    description: "People who can access this church portal.",
    showInSidebar: true,
  },
  {
    href: "/settings/preferences",
    label: "Preferences",
    icon: SlidersHorizontal,
    title: "Preferences",
    description: "Notification and OCR defaults.",
    showInSidebar: false,
  },
  {
    href: "/settings/record-fields",
    label: "Record fields",
    icon: FileText,
    title: "Record field mapping",
    description: "Labels, visibility, and display order per sacramental record type.",
    showInSidebar: true,
  },
  {
    href: "/help",
    label: "Help",
    icon: HelpCircle,
    title: "Help",
    description:
      "Documentation, support resources, and contact information for Orthodox Metrics.",
    showInSidebar: true,
  },
  {
    href: "/account",
    label: "My Account",
    icon: HelpCircle,
    title: "My Account",
    description: "Manage your profile, preferences, and account settings.",
    showInSidebar: false,
  },
] as const;

export const PAGE_TITLES: Readonly<Record<string, string>> = Object.fromEntries(
  PORTAL_NAV.map((item) => [item.href, item.title]),
);

/** Routes outside PORTAL_NAV that still need chrome/document titles. */
export const EXTRA_PAGE_TITLES: Readonly<Record<string, string>> = {
  "/onboarding/change-password": "Change password",
  "/onboarding/record-tables": "Record tables",
  "/onboarding/record-layouts": "Record layouts",
  "/settings/record-fields": "Record field mapping",
  "/ocr/settings": "OCR settings",
  "/auth/login": "Sign in",
  "/auth/forgot-password": "Forgot password",
  "/auth/unauthorized": "Not authorized",
  "/auth/verify-email": "Verify email",
  "/auth/accept-invite": "Accept invite",
};

export const PORTAL_SITE_NAME = "Orthodox Metrics Portal";

export function getNavItem(href: string): PortalNavItem | undefined {
  return PORTAL_NAV.find((item) => item.href === href);
}

/** Resolve a human page title from the current pathname (exact, extra, then longest nav prefix). */
export function resolvePageTitle(pathname: string): string {
  if (EXTRA_PAGE_TITLES[pathname]) return EXTRA_PAGE_TITLES[pathname];
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  let best: PortalNavItem | undefined;
  for (const item of PORTAL_NAV) {
    if (item.href === "/") continue;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  if (best) return best.title;
  if (pathname === "/") return PAGE_TITLES["/"] ?? "Home";
  return "Page not found";
}

export function formatDocumentTitle(pageTitle: string): string {
  return pageTitle ? `${pageTitle} · ${PORTAL_SITE_NAME}` : PORTAL_SITE_NAME;
}
