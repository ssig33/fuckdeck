import { Box, Text } from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { TimelineColumn } from "./TimelineColumn";
import { NotificationColumn } from "./NotificationColumn";

export function ColumnLayout() {
  const { accounts } = useAccounts();

  if (accounts.length === 0) {
    return (
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text c="dimmed">Add an account to get started</Text>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {accounts.map((account) => (
        <TimelineColumn key={account.id} account={account} />
      ))}
      <NotificationColumn />
    </Box>
  );
}
