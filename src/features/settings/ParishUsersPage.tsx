import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Table } from "@om/ui/table";
import { useMemo, useState } from "react";

import { PageLayout } from "../../components/PageLayout";
import { MOCK_PARISH_USERS, type ParishUser } from "./settingsData";

export function ParishUsersPage() {
  const [query] = useState("");
  const rows = useMemo(
    () =>
      MOCK_PARISH_USERS.filter((user) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.role.toLowerCase().includes(q)
        );
      }),
    [query],
  );

  return (
    <PageLayout
      title="Parish users"
      description="People who can sign in to this church’s Customer Portal."
    >
      <Stack gap="md">
        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3} style={{ fontWeight: 500 }}>
                Directory
              </Title>
              <Text size="sm" c="dimmed">
                {`${String(rows.length)} users · mock data`}
              </Text>
            </Group>
            <Table<ParishUser>
              accessibleLabel="Parish users"
              emptyMessage="No users match."
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
                    <Badge
                      variant="light"
                      color={
                        row.status === "active"
                          ? "teal"
                          : row.status === "invited"
                            ? "orange"
                            : "gray"
                      }
                    >
                      {row.status}
                    </Badge>
                  ),
                },
              ]}
              rows={rows}
            />
            <Text size="sm" c="dimmed">
              Invite / revoke flows wire after live auth + parish user APIs.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
