import {
  Box,
  Group,
  Avatar,
  Text,
  ActionIcon,
  Loader,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { Account } from "../types";
import { useTimeline } from "../hooks/useTimeline";
import { StatusCard } from "./StatusCard";
import { useAccounts } from "../hooks/useAccounts";

interface TimelineColumnProps {
  account: Account;
}

export function TimelineColumn({ account }: TimelineColumnProps) {
  const { statuses, isLoading, error } = useTimeline(account);
  const { removeAccount } = useAccounts();

  return (
    <Box
      style={{
        width: 350,
        minWidth: 350,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #333",
      }}
    >
      <Group
        p="sm"
        justify="space-between"
        style={{ borderBottom: "1px solid #333" }}
      >
        <Group gap="xs">
          {account.user && (
            <Avatar src={account.user.avatar} radius="xl" size="sm" />
          )}
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              {account.user?.display_name ?? account.user?.username ?? "Loading..."}
            </Text>
            <Text size="xs" c="dimmed">
              @{account.instance}
            </Text>
          </Stack>
        </Group>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          onClick={() => removeAccount(account.id)}
        >
          X
        </ActionIcon>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        {isLoading && statuses.length === 0 && (
          <Box p="md" style={{ textAlign: "center" }}>
            <Loader size="sm" />
          </Box>
        )}

        {error && (
          <Text c="red" p="md" size="sm">
            {error}
          </Text>
        )}

        {statuses.map((status) => (
          <StatusCard key={status.id} status={status} />
        ))}
      </ScrollArea>
    </Box>
  );
}
