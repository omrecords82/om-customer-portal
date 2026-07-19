import { Card, List, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Link, useNavigate } from "react-router";

import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { PORTAL_NAV } from "../../config/navConfig";

const WORKFLOW_HREFS = new Set([
  "/",
  "/records",
  "/ocr",
  "/ocr/mobile",
  "/certificates",
  "/onboarding",
]);

const PARISH_HREFS = new Set([
  "/settings/parish",
  "/settings/users",
  "/settings/preferences",
]);

export function HelpPage() {
  const navigate = useNavigate();
  const sitemap = PORTAL_NAV.filter((item) => item.showInSidebar !== false);
  const workflowLinks = sitemap.filter((item) => WORKFLOW_HREFS.has(item.href));
  const parishLinks = sitemap.filter((item) => PARISH_HREFS.has(item.href));
  const otherLinks = sitemap.filter(
    (item) => !WORKFLOW_HREFS.has(item.href) && !PARISH_HREFS.has(item.href),
  );

  return (
    <PageLayout
      title="Help"
      description="Guides and a map of Customer Portal areas."
    >
      <Stack gap="md" maw={720}>
        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Getting started
            </Title>
            <Text size="sm">
              Use OCR Desktop for batch registry scans, OCR Mobile for phone
              capture, and Onboarding to finish church portal preparation.
              Sacramental records and certificates connect when{" "}
              {authMode === "live" ? (
                <Text span fw={500}>
                  live auth
                </Text>
              ) : (
                <Text span fw={500}>
                  AUTH_MODE=live
                </Text>
              )}{" "}
              is enabled with church context.
            </Text>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              onAction={() => {
                void navigate("/onboarding");
              }}
            >
              Open onboarding
            </Button>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Certificates
            </Title>
            <Text size="sm">
              Open Certificates to pick a type (baptism, marriage, or reception),
              choose a template and sacramental record, then generate a PDF.
              History lists prior issuances with download when live APIs are
              available. Certificate Studio designer remains in the legacy
              portal; this surface focuses on generation and history.
            </Text>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              onAction={() => {
                void navigate("/certificates");
              }}
            >
              Open certificates
            </Button>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="sm">
            <Title order={3} style={{ fontWeight: 500 }}>
              Church metrics
            </Title>
            <Text size="sm">
              Open Church Metrics for sacramental KPIs from the same dashboard
              API as the parish hub. Distribution labels and optional charts
              summary notes load in live sessions; graphical charts stay
              deferred (no fake interactive reports).
            </Text>
            <Button
              className="om-btn-ghost"
              variant="secondary"
              size="sm"
              onAction={() => {
                void navigate("/metrics");
              }}
            >
              Open metrics
            </Button>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Site map
            </Title>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Workflows
              </Text>
              <List spacing="xs" size="sm">
                {workflowLinks.map((item) => (
                  <List.Item key={item.href}>
                    <Link to={item.href}>{item.label}</Link>
                    <Text span size="sm" c="dimmed">
                      {" — "}
                      {item.description}
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Parish administration
              </Text>
              <List spacing="xs" size="sm">
                {parishLinks.map((item) => (
                  <List.Item key={item.href}>
                    <Link to={item.href}>{item.label}</Link>
                    <Text span size="sm" c="dimmed">
                      {" — "}
                      {item.description}
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Stack>

            {otherLinks.length > 0 ? (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Other
                </Text>
                <List spacing="xs" size="sm">
                  {otherLinks.map((item) => (
                    <List.Item key={item.href}>
                      <Link to={item.href}>{item.label}</Link>
                      <Text span size="sm" c="dimmed">
                        {" — "}
                        {item.description}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Stack>
            ) : null}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="xs">
            <Title order={3} style={{ fontWeight: 500 }}>
              Support
            </Title>
            <Text size="sm" c="dimmed">
              For operational issues contact Orthodox Metrics support. Preview
              URL is{" "}
              <Text span fw={500}>
                /portal2
              </Text>
              ; legacy parish UI remains at{" "}
              <Text span fw={500}>
                /portal
              </Text>
              .
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
