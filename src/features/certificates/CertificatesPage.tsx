import {
  Badge,
  Card,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Button } from "@om/ui/button";
import { TextField } from "@om/ui/text-field";
import { useState } from "react";

import { PageLayout } from "../../components/PageLayout";
import { MOCK_CERTIFICATES, type CertificateRow } from "./certificatesData";

const KIND_LABEL: Record<CertificateRow["kind"], string> = {
  baptism: "Baptism",
  marriage: "Marriage",
  chrismation: "Chrismation",
};

/**
 * Wave F — certificates list / generate chrome. Designer canvas stays app-owned later.
 */
export function CertificatesPage() {
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <PageLayout
      title="Certificates"
      description="Issue and manage certificates of baptism, marriage, and chrismation."
    >
      <Stack gap="md">
        <Card padding="lg" maw={640}>
          <Stack gap="md">
            <Title order={3} style={{ fontWeight: 500 }}>
              Generate certificate
            </Title>
            <TextField
              label="Recipient name"
              value={recipient}
              onValueChange={setRecipient}
              placeholder="Full name as it should appear"
            />
            {status ? (
              <Text size="sm" role="status">
                {status}
              </Text>
            ) : null}
            <Button
              className="om-btn-primary"
              size="sm"
              accessibleLabel="Start certificate draft"
              onAction={() => {
                if (!recipient.trim()) {
                  setStatus("Enter a recipient name to start a draft.");
                  return;
                }
                setStatus(
                  `Draft started for ${recipient.trim()} (mock). Canvas designer is deferred.`,
                );
              }}
            >
              Start draft
            </Button>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3} style={{ fontWeight: 500 }}>
                History
              </Title>
              <Text size="sm" c="dimmed">
                mock data
              </Text>
            </Group>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Recipient</Table.Th>
                  <Table.Th>Kind</Table.Th>
                  <Table.Th>Issued</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MOCK_CERTIFICATES.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {row.recipient}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{KIND_LABEL[row.kind]}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.issued}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={
                          row.status === "issued"
                            ? "teal"
                            : row.status === "draft"
                              ? "orange"
                              : "gray"
                        }
                      >
                        {row.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  );
}
