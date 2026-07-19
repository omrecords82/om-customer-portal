import { Box, Group, Text } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconButton } from "@om/ui/icon-button";
import {
  MenuTrigger,
  Menu,
  MenuItem,
  Popover,
  Separator,
  Button,
} from "react-aria-components";
import { useLocation, useNavigate } from "react-router";
import { Menu as MenuIcon, Sun, Moon, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { FALLBACK_USER } from "../data/session";
import { PAGE_TITLES } from "../config/navConfig";

type TopHeaderProps = {
  onMobileToggle: () => void;
  onDesktopToggle: () => void;
  mobileNavExpanded: boolean;
  navbarId: string;
};

export function TopHeader({
  onMobileToggle,
  onDesktopToggle,
  mobileNavExpanded,
  navbarId,
}: TopHeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const pageTitle = PAGE_TITLES[location.pathname] ?? "";

  const displayName = user?.displayName ?? FALLBACK_USER.name;
  const displayRole = user?.role ?? FALLBACK_USER.role;
  const initials = user?.initials ?? FALLBACK_USER.initials;

  function handleBurgerPress() {
    if (isMobile === true) {
      onMobileToggle();
    } else {
      onDesktopToggle();
    }
  }

  return (
    <Group
      h="100%"
      px="md"
      justify="space-between"
      wrap="nowrap"
      style={{
        borderBottom:
          "1px solid var(--om-semantic-border-decorative, var(--mantine-color-default-border))",
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Box hiddenFrom="lg">
          <Button
            className="om-header-icon-btn"
            aria-label="Toggle navigation"
            {...(isMobile === true
              ? { "aria-expanded": mobileNavExpanded }
              : {})}
            aria-controls={navbarId}
            onPress={handleBurgerPress}
          >
            <MenuIcon size={18} aria-hidden="true" />
          </Button>
        </Box>
        {pageTitle ? (
          <Text size="sm" fw={500} visibleFrom="sm" style={{ lineHeight: 1 }}>
            {pageTitle}
          </Text>
        ) : null}
      </Group>

      <Group gap={4} wrap="nowrap">
        <IconButton
          className="om-header-icon-btn"
          variant="quiet"
          size="sm"
          accessibleLabel={
            colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          icon={
            colorScheme === "dark" ? (
              <Sun size={16} aria-hidden="true" />
            ) : (
              <Moon size={16} aria-hidden="true" />
            )
          }
          onAction={() => {
            toggleColorScheme();
          }}
        />

        <MenuTrigger>
          <Button className="om-user-btn" aria-label="Account menu">
            <Box
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--mantine-color-gold-5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--mantine-color-white)",
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {initials}
            </Box>
            <Box visibleFrom="sm" style={{ textAlign: "left" }}>
              <Text size="xs" fw={500} style={{ lineHeight: 1.25 }}>
                {displayName}
              </Text>
              <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                {displayRole}
              </Text>
            </Box>
            <ChevronDown size={12} aria-hidden="true" />
          </Button>

          <Popover className="om-menu-popover" placement="bottom end">
            <Menu aria-label="Account options">
              <MenuItem href="/account" className="om-menu-item">
                <User size={14} aria-hidden="true" />
                Profile
              </MenuItem>
              <MenuItem href="/account" className="om-menu-item">
                <Settings size={14} aria-hidden="true" />
                Preferences
              </MenuItem>
              <Separator className="om-menu-sep" />
              <MenuItem
                className="om-menu-item om-menu-item--danger"
                onAction={() => {
                  void logout().then(() => {
                    void navigate("/auth/login");
                  });
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                Sign out
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </Group>
    </Group>
  );
}
