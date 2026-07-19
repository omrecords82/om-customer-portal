import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppShell } from "@mantine/core";
import { Outlet, useLocation, useNavigate, useHref } from "react-router";
import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { PortalFooter } from "./PortalFooter";
import { SkipToContentLink } from "../a11y/SkipToContentLink";
import { useFocusMainOnNavigate } from "../a11y/useFocusMainOnNavigate";

export function PortalShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  useFocusMainOnNavigate();

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && mobileOpened) {
        closeMobile();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpened, closeMobile]);

  function handleNavClick() {
    closeMobile();
  }

  return (
    <AriaRouterProvider
      navigate={(to, options) => {
        void navigate(to, options);
      }}
      useHref={useHref}
    >
      <SkipToContentLink />
      <AppShell
        header={{ height: 52 }}
        navbar={{
          width: 240,
          breakpoint: "sm",
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        padding={0}
        style={{ height: "100vh" }}
      >
        <AppShell.Header>
          <TopHeader
            onMobileToggle={toggleMobile}
            onDesktopToggle={toggleDesktop}
            mobileNavExpanded={mobileOpened}
            navbarId="portal-sidebar"
          />
        </AppShell.Header>

        <AppShell.Navbar id="portal-sidebar" aria-label="Application">
          <Sidebar onNavClick={handleNavClick} />
        </AppShell.Navbar>

        <AppShell.Main
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 52px)",
          }}
        >
          <Box
            id="portal-main"
            component="main"
            tabIndex={-1}
            style={{ flex: 1, outline: "none" }}
          >
            <Outlet />
          </Box>
          <PortalFooter />
        </AppShell.Main>
      </AppShell>
    </AriaRouterProvider>
  );
}
