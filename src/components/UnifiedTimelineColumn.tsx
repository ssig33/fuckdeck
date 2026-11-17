import { Box, Group, Text, Loader, Badge } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useCallback, useRef } from "react";
import { List, useDynamicRowHeight } from "react-window";
import { useAccounts } from "../hooks/useAccounts";
import { UnifiedTimelineKind, useUnifiedTimeline } from "../hooks/useUnifiedTimeline";
import { UnifiedStatus } from "../types";
import { StatusCard } from "./StatusCard";

const LOAD_OLDER_THRESHOLD = 5;
const BORDER = "1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))";

interface RowProps {
  index: number;
  style: React.CSSProperties;
  rowRef: React.Ref<HTMLDivElement>;
  statuses: UnifiedStatus[];
}

function Row({ index, style, rowRef, statuses }: RowProps) {
  const { status, sourceAccount } = statuses[index];
  return (
    <div style={style} ref={rowRef}>
      <StatusCard
        status={status}
        account={sourceAccount}
        showVia
      />
    </div>
  );
}

const TITLES: Record<UnifiedTimelineKind, string> = {
  home: "Unified Timeline",
  local: "Unified Local Timeline",
};

interface UnifiedTimelineColumnProps {
  kind?: UnifiedTimelineKind;
}

export function UnifiedTimelineColumn({ kind = "home" }: UnifiedTimelineColumnProps) {
  const { accounts } = useAccounts();
  const {
    statuses,
    isLoading,
    isLoadingOlder,
    errors,
    loadOlder,
    trimOlder,
    connectionStatuses,
  } = useUnifiedTimeline(accounts, kind);
  const { ref, height } = useElementSize();
  const scrolledAwayRef = useRef(false);
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 150,
  });

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      if (visibleRows.stopIndex >= statuses.length - LOAD_OLDER_THRESHOLD) {
        loadOlder();
      }

      if (visibleRows.startIndex > 0) {
        scrolledAwayRef.current = true;
      } else if (scrolledAwayRef.current) {
        scrolledAwayRef.current = false;
        trimOlder();
      }
    },
    [statuses.length, loadOlder, trimOlder]
  );

  const streaming = accounts.filter(
    (a) => connectionStatuses.get(a.id) === "streaming"
  ).length;

  return (
    <Box
      style={{
        width: 350,
        minWidth: 350,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: BORDER,
      }}
    >
      <Group
        p="sm"
        justify="space-between"
        style={{ borderBottom: BORDER, minHeight: 62 }}
      >
        <Text size="sm" fw={600}>
          {TITLES[kind]}
        </Text>
        <Badge
          size="xs"
          color={streaming === accounts.length ? "green" : "yellow"}
          variant="dot"
        >
          {streaming} / {accounts.length} live
        </Badge>
      </Group>

      {errors.size > 0 && (
        <Box p="xs">
          <Text size="xs" c="red">
            {errors.size} account(s) failed to load
          </Text>
        </Box>
      )}

      <Box ref={ref} style={{ flex: 1, overflow: "hidden" }}>
        {isLoading && statuses.length === 0 && (
          <Box p="md" style={{ textAlign: "center" }}>
            <Loader size="sm" />
          </Box>
        )}

        {statuses.length > 0 && height > 0 && (
          <List
            rowCount={statuses.length}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowProps={{ statuses }}
            onRowsRendered={handleRowsRendered}
            height={height}
            width={350}
          />
        )}
      </Box>

      {isLoadingOlder && (
        <Box p="xs" style={{ textAlign: "center" }}>
          <Loader size="xs" />
        </Box>
      )}
    </Box>
  );
}
