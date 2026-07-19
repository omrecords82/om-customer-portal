import { Box, Group, Title, Text, Divider } from "@mantine/core";
import type { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ title, description, action, children }: PageLayoutProps) {
  return (
    <Box>
      {/* Page header */}
      <Box
        px={{ base: "md", sm: "lg", lg: "xl" }}
        pt={{ base: "md", sm: "lg" }}
        pb="md"
        style={{ background: "var(--mantine-color-body)" }}
      >
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Title
              order={2}
              style={{
                fontWeight: 500,
                color: "var(--mantine-color-text)",
              }}
            >
              {title}
            </Title>
            {description && (
              <Text size="sm" c="dimmed" mt={4} style={{ maxWidth: 520 }}>
                {description}
              </Text>
            )}
          </Box>
          {action && (
            <Box style={{ flexShrink: 0, paddingTop: 2 }}>{action}</Box>
          )}
        </Group>
      </Box>

      <Divider />

      {/* Page content */}
      <Box
        px={{ base: "md", sm: "lg", lg: "xl" }}
        py={{ base: "md", sm: "lg" }}
        style={{ background: "var(--mantine-color-default-hover)" }}
      >
        {children}
      </Box>
    </Box>
  );
}
