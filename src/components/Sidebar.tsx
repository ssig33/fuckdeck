import { useState } from "react";
import { ActionIcon, Box, Group, Title } from "@mantine/core";
import { ComposeForm } from "./ComposeForm";
import { getSidebarCollapsed, saveSidebarCollapsed } from "../utils/storage";

export function Sidebar() {
  const [collapsed, setCollapsedState] = useState(getSidebarCollapsed);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    saveSidebarCollapsed(value);
  };

  const width = collapsed ? 48 : 300;

  return (
    <Box
      style={{
        width,
        minWidth: width,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))",
        padding: collapsed ? "16px 8px" : 16,
        overflow: "auto",
      }}
    >
      {collapsed ? (
        <ActionIcon
          variant="subtle"
          onClick={() => setCollapsed(false)}
          aria-label="Open compose"
          title="Open compose"
        >
          ✏️
        </ActionIcon>
      ) : (
        <Group justify="space-between" mb="md" wrap="nowrap">
          <Title order={5}>Compose</Title>
          <ActionIcon
            variant="subtle"
            onClick={() => setCollapsed(true)}
            aria-label="Close compose"
            title="Close compose"
          >
            «
          </ActionIcon>
        </Group>
      )}
      {/* Kept mounted while collapsed so the draft survives. */}
      <Box style={{ display: collapsed ? "none" : "contents" }}>
        <ComposeForm />
      </Box>
    </Box>
  );
}
