import { Card, List, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Link, useNavigate } from "react-router";

import { PageLayout } from "../../components/PageLayout";
import { PORTAL_NAV } from "../../config/navConfig";

export function HelpPage() {
  const navigate = useNavigate();
  const sitemap = PORTAL_NAV.filter((item) => item.showInSidebar !== false);

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
              Use OCR Desktop for batch registry scans, OCR Mobile for phone capture, and
              Onboarding to finish church portal preparation.
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
              Site map
            </Title>
            <List spacing="xs" size="sm">
              {sitemap.map((item) => (
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
        </Card>

        <Card padding="lg">
          <Stack gap="xs">
            <Title order={3} style={{ fontWeight: 500 }}>
              Support
            </Title>
            <Text size="sm" c="dimmed">
              For operational issues contact Orthodox Metrics support. Preview URL is{" "}
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
