import { Box, Text, Title } from "@mantine/core";
import type { ElementType } from "react";
import { PageLayout } from "../components/PageLayout";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: ElementType;
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <PageLayout title={title} description={description}>
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <Box
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "var(--mantine-color-navy-0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--mantine-color-navy-6)",
            marginBottom: 16,
          }}
        >
          <Icon size={28} aria-hidden="true" />
        </Box>
        <Title
          order={3}
          mb={8}
          style={{ fontWeight: 500 }}
        >
          {title}
        </Title>
        <Text size="sm" c="dimmed" style={{ maxWidth: 340 }}>
          This section is being developed for the new customer portal. Check back soon.
        </Text>
      </Box>
    </PageLayout>
  );
}
