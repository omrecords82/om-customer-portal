import { Box, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { parish } from "../../data/session";

export function AuthLayout({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <Box
      component="main"
      id="portal-main"
      tabIndex={-1}
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background:
          "radial-gradient(1200px 600px at 10% -10%, color-mix(in srgb, var(--mantine-color-navy-3) 35%, transparent), transparent), var(--mantine-color-body)",
      }}
    >
      <Box maw={420} w="100%">
        <Stack gap="lg">
          <Stack gap={4}>
            <Text
              size="xs"
              tt="uppercase"
              fw={600}
              c="dimmed"
              style={{ letterSpacing: "0.1em" }}
            >
              {parish.shortName}
            </Text>
            <Title order={1} style={{ fontSize: 28, fontWeight: 500 }}>
              {title}
            </Title>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </Stack>
          {children}
        </Stack>
      </Box>
    </Box>
  );
}
