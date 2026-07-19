import { Card, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { useEffect, useState } from "react";

import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import type { NotificationPrefs, OcrPrefs } from "./settingsData";
import {
  fetchNotificationPrefs,
  fetchOcrPrefs,
  updateNotificationPrefs,
} from "./settingsApi";

export function PreferencesPage() {
  const live = authMode === "live";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(live);
  const [saving, setSaving] = useState(false);
  const [notificationsLive, setNotificationsLive] = useState(false);
  const [ocrPreviewOnly, setOcrPreviewOnly] = useState(true);

  useEffect(() => {
    if (!live) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external preferences bootstrap
    setLoading(true);
    void fetchNotificationPrefs().then((notifResult) => {
      const ocrResult = fetchOcrPrefs();
      if (cancelled) return;
      if (notifResult.ok) {
        setNotifications(notifResult.prefs);
        setNotificationsLive(notifResult.source === "live");
      } else {
        setLoadError(notifResult.message);
      }
      if (ocrResult.ok) {
        setOcr(ocrResult.prefs);
        setOcrPreviewOnly(ocrResult.source === "preview");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [live]);

  async function save() {
    setSaving(true);
    setStatus(null);

    if (live && notificationsLive) {
      const result = await updateNotificationPrefs(notifications);
      setSaving(false);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      setStatus(
        ocrPreviewOnly
          ? "Notification preferences saved. OCR defaults remain preview-only until aligned with /api/my/ocr-preferences."
          : "Preferences saved.",
      );
      return;
    }

    setSaving(false);
    setStatus("Preferences saved locally (preview mode).");
  }

  return (
    <PageLayout
      title="Preferences"
      description="Notification and OCR defaults for your parish account."
      action={
        <Button
          className="om-btn-primary"
          size="sm"
          accessibleLabel="Save preferences"
          isDisabled={loading || saving}
          isPending={saving}
          onAction={() => void save()}
        >
          Save
        </Button>
      }
    >
      <Stack gap="md" maw={640}>
        {live ? (
          <Text size="sm" c="dimmed">
            Live notification toggles persist via /api/notifications/preferences.
            Simplified OCR defaults stay preview-only until mapped to church OCR
            settings APIs.
          </Text>
        ) : null}
        {loadError ? (
          <Text size="sm" c="red" role="alert">
            {loadError}
          </Text>
        ) : null}
        {status ? (
          <Text size="sm" role="status">
            {status}
          </Text>
        ) : null}
        {loading ? (
          <Text size="sm" c="dimmed">
            Loading preferences…
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
              isDisabled={loading}
            >
              Weekly email digest
            </Switch>
            <Switch
              isSelected={notifications.ocrJobAlerts}
              onSelectionChange={(isSelected) =>
                setNotifications((prev) => ({ ...prev, ocrJobAlerts: isSelected }))
              }
              isDisabled={loading || (live && notificationsLive)}
            >
              OCR job completion alerts
            </Switch>
            {live && notificationsLive ? (
              <Text size="sm" c="dimmed">
                OCR job alerts are not yet available in the notification
                catalog — toggle disabled in live mode.
              </Text>
            ) : null}
            <Switch
              isSelected={notifications.certificateAlerts}
              onSelectionChange={(isSelected) =>
                setNotifications((prev) => ({
                  ...prev,
                  certificateAlerts: isSelected,
                }))
              }
              isDisabled={loading}
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
              isDisabled={loading || ocrPreviewOnly}
            >
              Prefer auto-seed when eligible
            </Switch>
            <Switch
              isSelected={ocr.autoOpenReview}
              onSelectionChange={(isSelected) =>
                setOcr((prev) => ({ ...prev, autoOpenReview: isSelected }))
              }
              isDisabled={loading || ocrPreviewOnly}
            >
              Open review workspace when a batch is ready
            </Switch>
            <Text size="sm" c="dimmed">
              {ocrPreviewOnly
                ? "OCR default toggles are preview-only. Full church OCR settings live at /api/my/ocr-preferences (admin roles)."
                : "Branding upload / theme editors stay deferred until brand tokens ship."}
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
