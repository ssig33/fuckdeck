import {
  Box,
  Group,
  Avatar,
  Text,
  ActionIcon,
  Loader,
  Stack,
  Badge,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { List, useDynamicRowHeight } from "react-window";
import { Account, MastodonStatus } from "../types";
import { useTimeline } from "../hooks/useTimeline";
import { StatusCard } from "./StatusCard";
import { useAccounts } from "../hooks/useAccounts";

interface TimelineColumnProps {
  account: Account;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  rowRef: React.Ref<HTMLDivElement>;
  statuses: MastodonStatus[];
  instance: string;
  token: string;
}

function Row({ index, style, rowRef, statuses, instance, token }: RowProps) {
  const status = statuses[index];
  return (
    <div style={style} ref={rowRef}>
      <StatusCard status={status} instance={instance} token={token} />
    </div>
  );
}

export function TimelineColumn({ account }: TimelineColumnProps) {
  const { statuses, isLoading, error, connectionStatus } = useTimeline(account);
  const { removeAccount } = useAccounts();
  const { ref, height } = useElementSize();
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 150,
  });

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'streaming':
        return <Badge size="xs" color="green" variant="dot">Live</Badge>;
      case 'polling':
        return <Badge size="xs" color="gray" variant="dot">Polling</Badge>;
      case 'connecting':
        return <Badge size="xs" color="yellow" variant="dot">Connecting...</Badge>;
      case 'error':
        return <Badge size="xs" color="red" variant="dot">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Box
      style={{
        width: 350,
        minWidth: 350,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))",
      }}
    >
      <Group
        p="sm"
        justify="space-between"
        style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))" }}
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
        <Group gap="xs">
          {getStatusBadge()}
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => removeAccount(account.id)}
          >
            X
          </ActionIcon>
        </Group>
      </Group>

      <Box ref={ref} style={{ flex: 1, overflow: "hidden" }}>
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

        {statuses.length > 0 && height > 0 && (
          <List
            rowCount={statuses.length}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowProps={{ statuses, instance: account.instance, token: account.accessToken }}
            height={height}
            width={350}
          />
        )}
      </Box>
    </Box>
  );
}
