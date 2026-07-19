import { Card, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { useState } from "react";

import { PageLayout } from "../../components/PageLayout";
import type { NotificationPrefs, OcrPrefs } from "./settingsData";

export function PreferencesPage() {
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    emailDigest: true,
    ocrJobAlerts: true,
    certificateAlerts: false,
  });
  const [ocr, setOcr] = useState<OcrPrefs>({
    defaultMode: "standard",
    autoOpenReview: true,
  });
  const [status, setStatus] = useState<string | null>(null);

  return (
    <PageLayout
      title="Preferences"
      description="Notification and OCR defaults for your parish account."
      action={
        <Button
          className="om-btn-primary"
          size="sm"
          accessibleLabel="Save preferences"
          onAction={() =>
            setStatus("Preferences saved locally (mock). Persist with Wave C APIs.")
          }
        >
          Save
        </Button>
      }
    >
      <Stack gap="md" maw={640}>
        {status ? (
          <Text size="sm" role="status">
            {status}
          </Text>
        ) : null}

        <Card padding="lg">
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Notifications
            </Title>
            <Switch
              isSelected={notifications.emailDigest}
              onSelectionChange={(isSelected) =>
                setNotifications((prev) => ({ ...prev, emailDigest: isSelected }))
              }
            >
              Weekly email digest
            </Switch>
            <Switch
              isSelected={notifications.ocrJobAlerts}
              onSelectionChange={(isSelected) =>
                setNotifications((prev) => ({ ...prev, ocrJobAlerts: isSelected }))
              }
            >
              OCR job completion alerts
            </Switch>
            <Switch
              isSelected={notifications.certificateAlerts}
              onSelectionChange={(isSelected) =>
                setNotifications((prev) => ({
                  ...prev,
                  certificateAlerts: isSelected,
                }))
              }
            >
              Certificate issuance alerts
            </Switch>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              OCR defaults
            </Title>
            <Switch
              isSelected={ocr.defaultMode === "autoseed"}
              onSelectionChange={(isSelected) =>
                setOcr((prev) => ({
                  ...prev,
                  defaultMode: isSelected ? "autoseed" : "standard",
                }))
              }
            >
              Prefer auto-seed when eligible
            </Switch>
            <Switch
              isSelected={ocr.autoOpenReview}
              onSelectionChange={(isSelected) =>
                setOcr((prev) => ({ ...prev, autoOpenReview: isSelected }))
              }
            >
              Open review workspace when a batch is ready
            </Switch>
            <Text size="sm" c="dimmed">
              Branding upload / theme editors stay deferred until brand tokens ship.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
