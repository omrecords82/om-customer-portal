import { Box, Group, ScrollArea, Text } from "@mantine/core";
import { Link } from "react-aria-components";
import { useLocation } from "react-router";
import { PORTAL_NAV } from "../config/navConfig";
import { useParishProfile } from "./ParishProfileProvider";

function OrthodoxCross() {
  return (
    <svg
      width="15"
      height="20"
      viewBox="0 0 20 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="10" y1="1" x2="10" y2="25" />
      <line x1="3" y1="7" x2="17" y2="7" />
      <line x1="5.5" y1="14" x2="14.5" y2="14" />
    </svg>
  );
}

type SidebarProps = {
  onNavClick: () => void;
};

export function Sidebar({ onNavClick }: SidebarProps) {
  const location = useLocation();
  const { profile: parish, note } = useParishProfile();
  const items = PORTAL_NAV.filter((item) => item.showInSidebar !== false);

  function isActive(href: string) {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  }

  return (
    <Box
      h="100%"
      style={{
        background: "var(--om-sidebar-bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        px="md"
        pt="lg"
        pb="md"
        style={{ borderBottom: "1px solid var(--om-sidebar-border)", flexShrink: 0 }}
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: 4,
              flexShrink: 0,
              background: "var(--om-sidebar-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--om-sidebar-accent)",
            }}
          >
            <OrthodoxCross />
          </Box>
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Text
              truncate
              fw={500}
              c="white"
              style={{ fontSize: 14.5, lineHeight: 1.3 }}
            >
              {parish.shortName}
            </Text>
            <Text
              size="xs"
              truncate
              style={{ color: "var(--om-sidebar-text-muted)", lineHeight: 1.3 }}
            >
              {parish.location}
            </Text>
          </Box>
        </Group>
        <Text
          mt="xs"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--om-sidebar-text-faint)",
          }}
        >
          {parish.diocese}
        </Text>
        {note ? (
          <Text
            mt={6}
            size="xs"
            style={{
              color: "var(--om-sidebar-text-faint)",
              lineHeight: 1.35,
              fontSize: 10,
            }}
          >
            {note}
          </Text>
        ) : null}
      </Box>

      <ScrollArea style={{ flex: 1 }} py="xs">
        <nav aria-label="Primary navigation">
          {items.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`om-sidebar-link${isActive(href) ? " active" : ""}`}
              aria-current={isActive(href) ? "page" : undefined}
              onPress={onNavClick}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </ScrollArea>

      <Box
        px="md"
        py="sm"
        style={{
          borderTop: "1px solid var(--om-sidebar-border)",
          flexShrink: 0,
        }}
      >
        <Text
          style={{
            fontSize: 10.5,
            color: "var(--om-sidebar-text-faint)",
            letterSpacing: "0.02em",
          }}
        >
          Orthodox Metrics Portal
        </Text>
      </Box>
    </Box>
  );
}
