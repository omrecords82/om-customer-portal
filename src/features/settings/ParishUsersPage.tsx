import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Table } from "@om/ui/table";
import { TextField } from "@om/ui/text-field";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { authMode } from "../../auth/config";
import { PageLayout } from "../../components/PageLayout";
import {
  fetchParishUsers,
  unlockParishUser,
} from "./settingsApi";
import { MOCK_PARISH_USERS, type ParishUser } from "./settingsData";

const STATUS_COLOR: Record<
  ParishUser["status"],
  "teal" | "orange" | "gray" | "yellow"
> = {
  active: "teal",
  invited: "orange",
  pending: "yellow",
  disabled: "gray",
};

const STATUS_LABEL: Record<ParishUser["status"], string> = {
  active: "Active",
  invited: "Invited",
  pending: "Pending activation",
  disabled: "Disabled",
};

export function ParishUsersPage() {
  const { user } = useAuth();
  const live = authMode === "live";

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<readonly ParishUser[]>(MOCK_PARISH_USERS);
  const [source, setSource] = useState<"preview" | "live" | "empty">("preview");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(live);
  const [canUnlock, setCanUnlock] = useState(!live);
  const [actionId, setActionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setStatus(null);
    void fetchParishUsers(user?.churchId, user?.role).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setUsers([]);
        setSource("empty");
        setLoadError(result.message);
        setCanUnlock(false);
        return;
      }
      setUsers(result.users);
      setSource(result.source === "live" ? "live" : "preview");
      setLoadError(null);
      setCanUnlock(result.canUnlock);
    });
  }, [user?.churchId, user?.role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external parish users bootstrap
    reload();
  }, [reload]);

  const rows = useMemo(
    () =>
      users.filter((row) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.role.toLowerCase().includes(q)
        );
      }),
    [query, users],
  );

  const pendingCount = useMemo(
    () => users.filter((row) => row.status === "pending" || row.isLocked).length,
    [users],
  );

  async function activateUser(row: ParishUser) {
    setActionId(row.id);
    setStatus(null);
    const result = await unlockParishUser(user?.churchId, row.id, user?.role);
    setActionId(null);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setStatus(
      result.source === "live"
        ? `${row.name} activated.`
        : `${row.name} activated locally (preview mode).`,
    );
    reload();
  }

  const sourceNote =
    source === "live"
      ? "Live directory from GET /api/admin/church-users/:churchId."
      : source === "preview"
        ? "Preview sample rows — not your church’s live directory."
        : null;

  return (
    <PageLayout
      title="Parish users"
      description="People who can sign in to this church’s Customer Portal."
      action={
        <Button
          className="om-btn-primary"
          size="sm"
          accessibleLabel="Invite parish user"
          isDisabled
        >
          Invite user
        </Button>
      }
    >
      <Stack gap="md">
        {live ? (
          <Text size="sm" c="dimmed">
            {sourceNote ??
              "Parish user directory requires church context and a church administrator role."}
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
        {pendingCount > 0 && source !== "empty" ? (
          <Text size="sm" c="orange">
            {`${String(pendingCount)} user${pendingCount === 1 ? "" : "s"} pending activation.`}
          </Text>
        ) : null}
        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Title order={3} style={{ fontWeight: 500 }}>
                Directory
              </Title>
              <Text size="sm" c="dimmed">
                {loading
                  ? "Loading…"
                  : `${String(rows.length)} user${rows.length === 1 ? "" : "s"}${
                      source === "preview" ? " · preview" : source === "live" ? " · live" : ""
                    }`}
              </Text>
            </Group>
            <TextField
              label="Search"
              value={query}
              onValueChange={setQuery}
              placeholder="Name, email, or role"
            />
            <Table<ParishUser>
              accessibleLabel="Parish users"
              emptyMessage={
                loading
                  ? "Loading parish users…"
                  : loadError
                    ? "Directory unavailable."
                    : "No users match your search."
              }
              isStriped
              columns={[
                {
                  id: "name",
                  header: "Name",
                  isRowHeader: true,
                  renderCell: (row) => row.name,
                },
                {
                  id: "email",
                  header: "Email",
                  renderCell: (row) => row.email,
                },
                {
                  id: "role",
                  header: "Role",
                  renderCell: (row) => row.role,
                },
                {
                  id: "status",
                  header: "Status",
                  renderCell: (row) => (
                    <Badge variant="light" color={STATUS_COLOR[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  ),
                },
                {
                  id: "actions",
                  header: "Actions",
                  renderCell: (row) => {
                    if (row.status === "pending" || row.isLocked) {
                      return (
                        <Button
                          className="om-btn-ghost"
                          size="sm"
                          variant="secondary"
                          accessibleLabel={`Activate ${row.name}`}
                          isDisabled={!canUnlock || actionId === row.id}
                          isPending={actionId === row.id}
                          onAction={() => void activateUser(row)}
                        >
                          Activate
                        </Button>
                      );
                    }
                    return (
                      <Button
                        className="om-btn-ghost"
                        size="sm"
                        variant="secondary"
                        accessibleLabel={`Revoke access for ${row.name}`}
                        isDisabled
                      >
                        Revoke
                      </Button>
                    );
                  },
                },
              ]}
              rows={loading ? [] : rows}
            />
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Invite is gated until a parish-scoped invite API ships — platform
                admins use <code>/api/admin/invites</code> today.
              </Text>
              <Text size="sm" c="dimmed">
                Revoke / lock stays disabled here — OM exposes lock only to
                platform admins on <code>/api/admin/church-users</code>. Activate
                uses the live unlock endpoint when your role allows it.
              </Text>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
