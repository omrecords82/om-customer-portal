import type { HubActivityItem, HubDashboardSlice } from "./hubApi";
import type { HubLiveState } from "./useHubDashboard";

export type HubSessionContext = {
  readonly liveSession: boolean;
  readonly displayName?: string | null;
};

export type HubPresentationInput = {
  readonly session: HubSessionContext;
  readonly hub: HubLiveState;
};

export function formatHubCount(
  value: number | null | undefined,
  loading: boolean,
): string {
  if (loading) return "…";
  if (value == null) return "—";
  return value.toLocaleString();
}

export function buildHubWelcomeLine(session: HubSessionContext): string {
  if (session.liveSession && session.displayName) {
    return `Signed in as ${session.displayName}.`;
  }
  return "Welcome to the Customer Portal preview. Summary and activity stay empty (not sample data).";
}

export function buildHubStatusNote(input: HubPresentationInput): string {
  const { session, hub } = input;

  if (!session.liveSession) {
    return "Preview mode — summary and activity are empty until live auth and hub APIs are enabled.";
  }
  if (hub.status === "loading") {
    return "Loading parish dashboard from live hub APIs…";
  }
  if (hub.status === "error") {
    return `Hub data unavailable — ${hub.message} Showing honest empty states.`;
  }
  if (hub.status === "ready" && hub.partialErrors.length > 0) {
    return `Some hub widgets failed (${hub.partialErrors.join(" ")}). Available data shown; failed tiles stay empty.`;
  }
  if (hub.status === "ready" && hub.source === "live") {
    return "Live hub data from church dashboard and certificate history.";
  }
  return "Dashboard KPIs and activity feed wait on live hub APIs — showing honest empty states (not sample data).";
}

export function dashboardUnavailable(
  hub: HubLiveState,
  loading: boolean,
): boolean {
  if (loading) return false;
  if (hub.status === "error") return true;
  return hub.status === "ready" && hub.source === "live" && hub.dashboard == null;
}

export function certificateCountUnavailable(
  hub: HubLiveState,
  loading: boolean,
): boolean {
  if (loading) return false;
  if (hub.status === "error") return true;
  return (
    hub.status === "ready" &&
    hub.source === "live" &&
    hub.certificatesIssued == null &&
    hub.partialErrors.some((e) => /certificate/i.test(e))
  );
}

export function buildSacramentalRecordsNote(input: {
  readonly session: HubSessionContext;
  readonly dashboard: HubDashboardSlice | null;
  readonly dashFailed: boolean;
}): string {
  if (input.dashFailed) return "Dashboard API unavailable";
  if (input.session.liveSession && input.dashboard) {
    return `${input.dashboard.baptisms.toLocaleString()} baptisms · ${input.dashboard.marriages.toLocaleString()} marriages · ${input.dashboard.funerals.toLocaleString()} funerals`;
  }
  return "Sacramental totals when dashboard API connects";
}

export function buildRecordsThisMonthNote(input: {
  readonly session: HubSessionContext;
  readonly dashboard: HubDashboardSlice | null;
  readonly dashFailed: boolean;
}): string {
  if (input.dashFailed) return "Dashboard API unavailable";
  if (input.session.liveSession && input.dashboard) {
    return "From church dashboard monthly activity";
  }
  return "Monthly sacramental activity when dashboard API connects";
}

export function buildCertificatesNote(input: {
  readonly session: HubSessionContext;
  readonly certificatesIssued: number | null;
  readonly certFailed: boolean;
}): string {
  if (input.certFailed) return "Certificate history unavailable";
  if (input.session.liveSession && input.certificatesIssued != null) {
    return "From certificate generation history";
  }
  return "Certificate history when cert APIs connect";
}

export function buildActivityEmptyDescription(liveSession: boolean): string {
  if (liveSession) {
    return "No recent sacramental records returned for this parish.";
  }
  return "Parish activity will appear here once live hub events are wired. Quick actions above still work.";
}

export type HubSecondaryModule = {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly availability: "ready" | "preview" | "disabled";
  readonly availabilityNote: string;
};

export function buildHubSecondaryModules(opts: {
  readonly cemeteryEnabled: boolean;
}): readonly HubSecondaryModule[] {
  return [
    {
      href: "/records",
      label: "Records",
      description: "Browse baptisms, marriages, and funerals.",
      availability: "ready",
      availabilityNote: "Lists load in preview; live edits require Wave H gates.",
    },
    {
      href: "/certificates",
      label: "Certificates",
      description: "Issue and review certificate history.",
      availability: "preview",
      availabilityNote: "History count on dashboard when live cert APIs respond.",
    },
    {
      href: "/metrics",
      label: "Church Metrics",
      description: "Sacramental trends and parish growth charts.",
      availability: "preview",
      availabilityNote:
        "KPI tiles reuse hub dashboard API; charts rendering deferred.",
    },
    {
      href: "/cemetery",
      label: "Cemetery",
      description: "Plot lookup and read-only map for enabled parishes.",
      availability: opts.cemeteryEnabled ? "preview" : "disabled",
      availabilityNote: opts.cemeteryEnabled
        ? "Feature-flagged on; map requires validated geometry."
        : "Disabled by default — operator enables per pilot church.",
    },
    {
      href: "/help",
      label: "Help",
      description: "Guides, site map, and support contacts.",
      availability: "ready",
      availabilityNote: "Always available.",
    },
  ];
}

export function hubActivityItems(hub: HubLiveState): readonly HubActivityItem[] {
  return hub.status === "ready" ? hub.activity : [];
}

export function hubDashboardSlice(
  hub: HubLiveState,
): HubDashboardSlice | null {
  return hub.status === "ready" ? hub.dashboard : null;
}

export function hubCertificatesIssued(
  hub: HubLiveState,
): number | null {
  return hub.status === "ready" ? hub.certificatesIssued : null;
}

export function hubPartialErrors(
  hub: HubLiveState,
): readonly string[] {
  return hub.status === "ready" ? hub.partialErrors : [];
}
