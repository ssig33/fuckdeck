import { Box, Group, Text, ActionIcon, Loader } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { List, useDynamicRowHeight } from "react-window";
import { useAccounts } from "../hooks/useAccounts";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationCard } from "./NotificationCard";
import { UnifiedNotification } from "../types";

interface RowProps {
  index: number;
  style: React.CSSProperties;
  rowRef: React.Ref<HTMLDivElement>;
  notifications: UnifiedNotification[];
}

function Row({ index, style, rowRef, notifications }: RowProps) {
  const item = notifications[index];
  return (
    <div style={style} ref={rowRef}>
      <NotificationCard unified={item} />
    </div>
  );
}

export function NotificationColumn() {
  const { accounts } = useAccounts();
  const { notifications, isLoading, errors, refresh } =
    useNotifications(accounts);
  const { ref, height } = useElementSize();
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 120,
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
        style={{ borderBottom: "1px solid #333", minHeight: 62 }}
      >
        <Text size="sm" fw={600}>
          Notifications
        </Text>
        <ActionIcon variant="subtle" size="sm" onClick={refresh}>
          ↻
        </ActionIcon>
      </Group>

      {errors.size > 0 && (
        <Box p="xs" style={{ backgroundColor: "#3a2020" }}>
          <Text size="xs" c="red">
            {errors.size} account(s) failed to load
          </Text>
        </Box>
      )}

      <Box ref={ref} style={{ flex: 1, overflow: "hidden" }}>
        {isLoading && notifications.length === 0 && (
          <Box p="md" style={{ textAlign: "center" }}>
            <Loader size="sm" />
          </Box>
        )}

        {notifications.length === 0 && !isLoading && (
          <Box p="md" style={{ textAlign: "center" }}>
            <Text c="dimmed" size="sm">
              No notifications
            </Text>
          </Box>
        )}

        {notifications.length > 0 && height > 0 && (
          <List
            rowCount={notifications.length}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowProps={{ notifications }}
            height={height}
            width={350}
          />
        )}
      </Box>
    </Box>
  );
}
