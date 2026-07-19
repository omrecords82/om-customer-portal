import { Box, Group, Text } from "@mantine/core";
import { parish } from "../data/session";

export function PortalFooter() {
  return (
    <Box
      component="footer"
      style={{
        borderTop: "1px solid var(--om-semantic-border-decorative, var(--mantine-color-default-border))",
        background: "var(--mantine-color-body)",
        flexShrink: 0,
      }}
      px={{ base: "md", sm: "lg", lg: "xl" }}
      py="md"
    >
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Box>
          <Text
            size="sm"
            fw={500}
          >
            {parish.name}
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            {parish.location} · {parish.diocese}
          </Text>
        </Box>
        <Text size="xs" c="dimmed">
          Powered by{" "}
          <Text component="span" size="xs" fw={500} c="var(--mantine-color-text)">
            Orthodox Metrics
          </Text>
        </Text>
      </Group>
    </Box>
  );
}
