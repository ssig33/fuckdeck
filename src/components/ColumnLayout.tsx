import { Box, Text } from "@mantine/core";
import { useAccounts } from "../hooks/useAccounts";
import { TimelineColumn } from "./TimelineColumn";

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
        overflow: "auto",
      }}
    >
      {accounts.map((account) => (
        <TimelineColumn key={account.id} account={account} />
      ))}
    </Box>
  );
}
