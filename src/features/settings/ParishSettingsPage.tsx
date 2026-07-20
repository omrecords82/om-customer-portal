import { Card, Group, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  applyJurisdictionSelection,
  fetchJurisdictions,
  fetchParishProfile,
  updateParishProfile,
} from "./settingsApi";
import {
  DEFAULT_PARISH,
  PARISH_LANGUAGE_OPTIONS,
  type JurisdictionOption,
  type ParishProfile,
} from "./settingsData";
import {
  formatParishJurisdictionLine,
  formatParishLocationLine,
  parishProfilesEqual,
  validateParishProfile,
} from "./parishSettingsValidation";

export function ParishSettingsPage() {
  const { user } = useAuth();
  const live = authMode === "live";

  const [profile, setProfile] = useState<ParishProfile>(DEFAULT_PARISH);
  const [savedProfile, setSavedProfile] = useState<ParishProfile>(DEFAULT_PARISH);
  const [jurisdictions, setJurisdictions] = useState<readonly JurisdictionOption[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(live);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editable, setEditable] = useState(!live);

  const dirty = editing && !parishProfilesEqual(profile, savedProfile);

  const jurisdictionSelectData = useMemo(
    () =>
      jurisdictions.map((j) => ({
        value: String(j.id),
        label: j.abbreviation ? `${j.name} (${j.abbreviation})` : j.name,
      })),
    [jurisdictions],
  );

  const languageSelectData = useMemo(
    () => PARISH_LANGUAGE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  useEffect(() => {
    if (!live) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external parish settings bootstrap
    setLoading(true);
    void Promise.all([fetchParishProfile(user?.role), fetchJurisdictions()]).then(
      ([parishResult, jurisdictionResult]) => {
        if (cancelled) return;
        const errors: string[] = [];

        if (parishResult.ok) {
          setProfile(parishResult.profile);
          setSavedProfile(parishResult.profile);
          setEditable(parishResult.editable);
        } else {
          errors.push(parishResult.message);
        }

        if (jurisdictionResult.ok) {
          setJurisdictions(jurisdictionResult.jurisdictions);
        } else {
          errors.push(jurisdictionResult.message);
        }

        setLoadError(errors.length > 0 ? errors.join(" ") : null);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [live, user?.role]);

  function update<K extends keyof ParishProfile>(key: K, value: ParishProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function onJurisdictionChange(value: string | null) {
    if (!value) {
      setProfile((prev) => applyJurisdictionSelection(prev, null));
      return;
    }
    const match = jurisdictions.find((j) => String(j.id) === value) ?? null;
    setProfile((prev) => applyJurisdictionSelection(prev, match));
  }

  async function save() {
    const validation = validateParishProfile(profile);
    if (!validation.ok) {
      setStatus(validation.message);
      return;
    }

    setSaving(true);
    setStatus(null);
    const result = await updateParishProfile(profile, user?.role);
    setSaving(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setSavedProfile(profile);
    setStatus(
      result.source === "live"
        ? "Parish details saved."
        : "Parish details saved locally (preview mode).",
    );
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setProfile(savedProfile);
    setStatus(null);
  }

  function startEdit() {
    setEditing(true);
    setStatus(null);
  }

  return (
    <PageLayout
      title="Parish settings"
      description="Church identity, contact, address, and liturgical settings for your parish."
      {...(editing || loading || !editable
        ? {}
        : {
            action: (
              <Button
                className="om-btn-primary"
                size="sm"
                accessibleLabel="Edit parish details"
                onAction={startEdit}
              >
                Edit
              </Button>
            ),
          })}
    >
      <Stack gap="md" maw={760}>
        {live ? (
          <Text size="sm" c="dimmed">
            Live parish details load from GET/PUT /api/my/church-settings when church
            context is present.
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
            Your role can view parish details but cannot edit them. Contact a church
            administrator or priest to update church information.
          </Text>
        ) : null}

        {loading ? (
          <Text size="sm" c="dimmed">
            Loading parish details…
          </Text>
        ) : editing && editable ? (
          <Stack gap="md">
            <Card padding="lg">
              <Stack gap="md">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Basic information
                </Title>
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
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextField
                    label="Office email"
                    type="email"
                    value={profile.email}
                    onValueChange={(value) => update("email", value)}
                  />
                  <TextField
                    label="Office phone"
                    value={profile.phone}
                    onValueChange={(value) => update("phone", value)}
                  />
                </SimpleGrid>
                <TextField
                  label="Website"
                  type="url"
                  value={profile.website}
                  onValueChange={(value) => update("website", value)}
                />
              </Stack>
            </Card>

            <Card padding="lg">
              <Stack gap="md">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Address
                </Title>
                <TextField
                  label="Street address"
                  value={profile.address}
                  onValueChange={(value) => update("address", value)}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextField
                    label="City"
                    value={profile.city}
                    onValueChange={(value) => update("city", value)}
                  />
                  <TextField
                    label="State / Province"
                    value={profile.stateProvince}
                    onValueChange={(value) => update("stateProvince", value)}
                  />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextField
                    label="Postal code"
                    value={profile.postalCode}
                    onValueChange={(value) => update("postalCode", value)}
                  />
                  <TextField
                    label="Country"
                    value={profile.country}
                    onValueChange={(value) => update("country", value)}
                  />
                </SimpleGrid>
              </Stack>
            </Card>

            <Card padding="lg">
              <Stack gap="md">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Liturgical settings
                </Title>
                <Select
                  label="Jurisdiction"
                  placeholder="Select jurisdiction"
                  data={jurisdictionSelectData}
                  value={profile.jurisdictionId != null ? String(profile.jurisdictionId) : null}
                  onChange={onJurisdictionChange}
                  searchable
                  clearable
                />
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    Calendar type
                  </Text>
                  <Text size="sm">{profile.calendarType || "—"}</Text>
                  <Text size="xs" c="dimmed">
                    Derived from the selected jurisdiction.
                  </Text>
                </Stack>
                <Select
                  label="Preferred language"
                  data={languageSelectData}
                  value={profile.preferredLanguage}
                  onChange={(value) => update("preferredLanguage", value ?? "en")}
                />
              </Stack>
            </Card>

            <Group gap="sm" justify="flex-end">
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
                isDisabled={saving || !dirty}
              >
                Save changes
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <Card padding="lg">
              <Stack gap="xs">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Basic information
                </Title>
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
                    Email:{" "}
                  </Text>
                  {profile.email || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Phone:{" "}
                  </Text>
                  {profile.phone || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Website:{" "}
                  </Text>
                  {profile.website || "—"}
                </Text>
              </Stack>
            </Card>

            <Card padding="lg">
              <Stack gap="xs">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Address
                </Title>
                <Text size="sm">
                  <Text span fw={500}>
                    Street:{" "}
                  </Text>
                  {profile.address || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    City:{" "}
                  </Text>
                  {profile.city || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    State / Province:{" "}
                  </Text>
                  {profile.stateProvince || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Postal code:{" "}
                  </Text>
                  {profile.postalCode || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Country:{" "}
                  </Text>
                  {profile.country || "—"}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatParishLocationLine(profile)}
                </Text>
              </Stack>
            </Card>

            <Card padding="lg">
              <Stack gap="xs">
                <Title order={3} style={{ fontWeight: 500 }}>
                  Liturgical settings
                </Title>
                <Text size="sm">
                  <Text span fw={500}>
                    Jurisdiction:{" "}
                  </Text>
                  {formatParishJurisdictionLine(profile) || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Calendar type:{" "}
                  </Text>
                  {profile.calendarType || "—"}
                </Text>
                <Text size="sm">
                  <Text span fw={500}>
                    Preferred language:{" "}
                  </Text>
                  {PARISH_LANGUAGE_OPTIONS.find((o) => o.value === profile.preferredLanguage)
                    ?.label ?? profile.preferredLanguage}
                </Text>
              </Stack>
            </Card>
          </Stack>
        )}
      </Stack>
    </PageLayout>
  );
}
