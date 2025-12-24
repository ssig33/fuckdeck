import { Box, Title } from "@mantine/core";
import { ComposeForm } from "./ComposeForm";

export function Sidebar() {
  return (
    <Box
      style={{
        width: 300,
        minWidth: 300,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))",
        padding: 16,
        overflow: "auto",
      }}
    >
      <Title order={5} mb="md">
        Compose
      </Title>
      <ComposeForm />
    </Box>
  );
}
