import { Card, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Switch } from "@om/ui/switch";
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import type { NotificationPrefs, OcrPrefs } from "./settingsData";
import {
  fetchNotificationPrefs,
  fetchOcrPrefs,
  updateNotificationPrefs,
  updateOcrPrefs,
} from "./settingsApi";

export function PreferencesPage() {
  const { user } = useAuth();
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
  const [ocrEditable, setOcrEditable] = useState(false);
  const [ocrAutoseedLive, setOcrAutoseedLive] = useState(false);
  const [ocrAutoOpenLive, setOcrAutoOpenLive] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(true);

  useEffect(() => {
    if (!live) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external preferences bootstrap
    setLoading(true);
    void Promise.all([fetchNotificationPrefs(), fetchOcrPrefs(user?.role)]).then(
      ([notifResult, ocrResult]) => {
        if (cancelled) return;

        const errors: string[] = [];
        if (notifResult.ok) {
          setNotifications(notifResult.prefs);
          setNotificationsLive(notifResult.source === "live");
        } else {
          errors.push(notifResult.message);
        }

        if (ocrResult.ok) {
          setOcr(ocrResult.prefs);
          setOcrEditable(ocrResult.editable);
          setOcrAutoseedLive(ocrResult.prefs.autoseedLive);
          setOcrAutoOpenLive(ocrResult.prefs.autoOpenReviewLive);
          setOcrEnabled(ocrResult.prefs.ocrEnabled);
        } else {
          errors.push(ocrResult.message);
        }

        setLoadError(errors.length > 0 ? errors.join(" ") : null);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [live, user?.role]);

  async function save() {
    setSaving(true);
    setStatus(null);

    if (!live) {
      setSaving(false);
      setStatus("Preferences saved locally (preview mode).");
      return;
    }

    const messages: string[] = [];

    if (notificationsLive) {
      const result = await updateNotificationPrefs(notifications);
      if (!result.ok) {
        setSaving(false);
        setStatus(result.message);
        return;
      }
      messages.push("Notification preferences saved.");
    }

    if (ocrEditable) {
      const result = await updateOcrPrefs(ocr, user?.role);
      if (!result.ok) {
        setSaving(false);
        setStatus(result.message);
        return;
      }
      messages.push("OCR defaults saved.");
    }

    setSaving(false);

    if (messages.length === 0) {
      setStatus("No live preference sections are editable for your role.");
      return;
    }

    if (ocrAutoseedLive && !ocrEditable) {
      messages.push("OCR is disabled for this parish — autoseed default not saved.");
    }

    setStatus(messages.join(" "));
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
            Church administrators can save the autoseed default via
            /api/my/ocr-preferences (maps to useRecordSnippets).
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
              isDisabled={loading || (live && !ocrEditable)}
            >
              Prefer auto-seed when eligible
            </Switch>
            <Switch
              isSelected={ocr.autoOpenReview}
              onSelectionChange={(isSelected) =>
                setOcr((prev) => ({ ...prev, autoOpenReview: isSelected }))
              }
              isDisabled={loading || (live && !ocrAutoOpenLive)}
            >
              Open review workspace when a batch is ready
            </Switch>
            <Text size="sm" c="dimmed">
              {!live
                ? "Preview mode — OCR toggles save locally only."
                : !ocrAutoseedLive
                  ? "Church OCR defaults require a church administrator role (super_admin, admin, or church_admin)."
                  : !ocrEnabled
                    ? "OCR is disabled for this parish. Autoseed default cannot be changed until OCR is enabled."
                    : "Autoseed maps to church useRecordSnippets. Review auto-open has no API field yet — toggle disabled in live mode."}
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
