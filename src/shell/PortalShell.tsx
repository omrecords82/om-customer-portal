import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppShell } from "@mantine/core";
import { Outlet, useNavigate, useHref } from "react-router";
import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { PortalFooter } from "./PortalFooter";

export function PortalShell() {
  const navigate = useNavigate();

  // Separate open states so mobile starts closed and desktop starts open
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  // Close mobile drawer after navigation
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
          />
        </AppShell.Header>

        <AppShell.Navbar>
          <Sidebar onNavClick={handleNavClick} />
        </AppShell.Navbar>

        <AppShell.Main
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 52px)",
          }}
        >
          {/* Page content fills remaining height, footer is pinned below */}
          <Box style={{ flex: 1 }}>
            <Outlet />
          </Box>
          <PortalFooter />
        </AppShell.Main>
      </AppShell>
    </AriaRouterProvider>
  );
}
