import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import { DEFAULT_PARISH, type ParishProfile } from "./settingsData";
import {
  fetchParishProfile,
  updateParishProfile,
} from "./settingsApi";

export function ParishSettingsPage() {
  const { user } = useAuth();
  const live = authMode === "live";

  const [profile, setProfile] = useState<ParishProfile>(DEFAULT_PARISH);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(live);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editable, setEditable] = useState(!live);

  useEffect(() => {
    if (!live) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external parish settings bootstrap
    setLoading(true);
    void fetchParishProfile(user?.role).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setProfile(result.profile);
        setEditable(result.editable);
        setLoadError(null);
      } else {
        setLoadError(result.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [live, user?.role]);

  function update<K extends keyof ParishProfile>(key: K, value: ParishProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const result = await updateParishProfile(profile, user?.role);
    setSaving(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus(
      result.source === "live"
        ? "Parish details saved."
        : "Parish details saved locally (preview mode).",
    );
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    if (!live) {
      setProfile(DEFAULT_PARISH);
      return;
    }
    setLoading(true);
    void fetchParishProfile(user?.role).then((result) => {
      if (result.ok) setProfile(result.profile);
      setLoading(false);
    });
  }

  return (
    <PageLayout
      title="Parish settings"
      description="Church identity and contact details shown across the Customer Portal."
      {...(editing || loading || !editable
        ? {}
        : {
            action: (
              <Button
                className="om-btn-primary"
                size="sm"
                accessibleLabel="Edit parish details"
                onAction={() => setEditing(true)}
              >
                Edit
              </Button>
            ),
          })}
    >
      <Stack gap="md" maw={720}>
        {live ? (
          <Text size="sm" c="dimmed">
            Live parish details load from GET/PUT /api/my/church-settings when
            church context is present.
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
        {!editable && live ? (
          <Text size="sm" c="dimmed">
            Your role can view parish details but cannot edit them. Contact a
            church administrator to update church information.
          </Text>
        ) : null}
        <Card padding="lg">
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Church details
            </Title>
            {loading ? (
              <Text size="sm" c="dimmed">
                Loading parish details…
              </Text>
            ) : editing && editable ? (
              <>
                <TextField
                  label="Official name"
                  value={profile.name}
                  onValueChange={(value) => update("name", value)}
                />
                <TextField
                  label="Short name"
                  value={profile.shortName}
                  onValueChange={(value) => update("shortName", value)}
                />
                <TextField
                  label="Location"
                  value={profile.location}
                  onValueChange={(value) => update("location", value)}
                />
                <TextField
                  label="Diocese"
                  value={profile.diocese}
                  onValueChange={(value) => update("diocese", value)}
                />
                <TextField
                  label="Office phone"
                  value={profile.phone}
                  onValueChange={(value) => update("phone", value)}
                />
                <TextField
                  label="Office email"
                  type="email"
                  value={profile.email}
                  onValueChange={(value) => update("email", value)}
                />
                <TextField
                  label="Website"
                  type="url"
                  value={profile.website}
                  onValueChange={(value) => update("website", value)}
                />
                <Group gap="sm">
                  <Button
                    className="om-btn-ghost"
                    variant="secondary"
                    size="sm"
                    onAction={cancelEdit}
                    isDisabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="om-btn-primary"
                    size="sm"
                    onAction={() => void save()}
                    isPending={saving}
                    isDisabled={saving}
                  >
                    Save changes
                  </Button>
                </Group>
              </>
            ) : (
              <Stack gap="xs">
                <Text size="sm">
                  <Text span fw={500}>
                    Official name:{" "}
                  </Text>
                  {profile.name}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Short name:{" "}
                  </Text>
                  {profile.shortName}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Location:{" "}
                  </Text>
                  {profile.location}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Diocese:{" "}
                  </Text>
                  {profile.diocese}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Phone:{" "}
                  </Text>
                  {profile.phone}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Email:{" "}
                  </Text>
                  {profile.email}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Website:{" "}
                  </Text>
                  {profile.website}
                </Text>
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
