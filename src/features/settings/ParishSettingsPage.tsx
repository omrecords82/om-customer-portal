import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useState } from "react";

import { PageLayout } from "../../components/PageLayout";
import { DEFAULT_PARISH, type ParishProfile } from "./settingsData";

export function ParishSettingsPage() {
  const [profile, setProfile] = useState<ParishProfile>(DEFAULT_PARISH);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function update<K extends keyof ParishProfile>(key: K, value: ParishProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setStatus("Parish details saved locally (mock). Live parish APIs land with Wave C backend wiring.");
    setEditing(false);
  }

  return (
    <PageLayout
      title="Parish settings"
      description="Church identity and contact details shown across the Customer Portal."
      {...(editing
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
        {status ? (
          <Text size="sm" role="status">
            {status}
          </Text>
        ) : null}
        <Card padding="lg">
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Church details
            </Title>
            {editing ? (
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
                    onAction={() => {
                      setProfile(DEFAULT_PARISH);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="om-btn-primary" size="sm" onAction={save}>
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
