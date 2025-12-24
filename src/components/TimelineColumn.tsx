import {
  Box,
  Group,
  Avatar,
  Text,
  ActionIcon,
  Loader,
  Stack,
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
}

function Row({ index, style, rowRef, statuses }: RowProps) {
  const status = statuses[index];
  return (
    <div style={style} ref={rowRef}>
      <StatusCard status={status} />
    </div>
  );
}

export function TimelineColumn({ account }: TimelineColumnProps) {
  const { statuses, isLoading, error } = useTimeline(account);
  const { removeAccount } = useAccounts();
  const { ref, height } = useElementSize();
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 150,
  });

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
            rowProps={{ statuses }}
            height={height}
            width={350}
          />
        )}
      </Box>
    </Box>
  );
}
