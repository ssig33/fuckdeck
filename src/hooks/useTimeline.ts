import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Account, MastodonStatus, ConnectionStatus } from "../types";
import { getHomeTimeline } from "../utils/mastodon";
import { useAccounts } from "./useAccounts";

const POLL_INTERVAL = 60000;
const MAX_RECENT_STATUSES = 200;
const OLDER_PAGE_SIZE = 40;

interface UseTimelineResult {
  statuses: MastodonStatus[];
  isLoading: boolean;
  isLoadingOlder: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadOlder: () => void;
  connectionStatus: ConnectionStatus;
}

export function useTimeline(account: Account): UseTimelineResult {
  const { streamingStatuses, connectionStatuses } = useAccounts();
  const [pollingStatuses, setPollingStatuses] = useState<MastodonStatus[]>([]);
  const [olderStatuses, setOlderStatuses] = useState<MastodonStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestIdRef = useRef<string | null>(null);
  const oldestIdRef = useRef<string | null>(null);
  const isLoadingOlderRef = useRef(false);
  const pollIntervalRef = useRef<number | null>(null);

  const connectionStatus = connectionStatuses.get(account.id) || 'connecting';
  const streamStatuses = streamingStatuses.get(account.id) || [];

  const statuses = useMemo(() => {
    const statusMap = new Map<string, MastodonStatus>();

    [...streamStatuses, ...pollingStatuses, ...olderStatuses].forEach(status => {
      if (!statusMap.has(status.id)) {
        statusMap.set(status.id, status);
      }
    });

    return Array.from(statusMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [streamStatuses, pollingStatuses, olderStatuses]);

  useEffect(() => {
    if (statuses.length > 0) {
      oldestIdRef.current = statuses[statuses.length - 1].id;
    }
  }, [statuses]);

  const fetchTimeline = useCallback(
    async (sinceId?: string) => {
      try {
        const newStatuses = await getHomeTimeline(
          account.instance,
          account.accessToken,
          { sinceId, limit: 40 }
        );

        if (newStatuses.length > 0) {
          if (sinceId) {
            setPollingStatuses((prev) =>
              [...newStatuses, ...prev].slice(0, MAX_RECENT_STATUSES)
            );
          } else {
            setPollingStatuses(newStatuses);
          }
          latestIdRef.current = newStatuses[0].id;
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      } finally {
        setIsLoading(false);
      }
    },
    [account.instance, account.accessToken]
  );

  const loadOlder = useCallback(async () => {
    if (isLoadingOlderRef.current || !hasMore || !oldestIdRef.current) {
      return;
    }

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    try {
      const older = await getHomeTimeline(account.instance, account.accessToken, {
        maxId: oldestIdRef.current,
        limit: OLDER_PAGE_SIZE,
      });

      if (older.length > 0) {
        setOlderStatuses((prev) => [...prev, ...older]);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load older statuses");
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [account.instance, account.accessToken, hasMore]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchTimeline();
  }, [fetchTimeline]);

  useEffect(() => {
    fetchTimeline();

    if (connectionStatus === 'streaming') {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } else {
      if (pollIntervalRef.current === null) {
        pollIntervalRef.current = window.setInterval(() => {
          if (latestIdRef.current) {
            fetchTimeline(latestIdRef.current);
          }
        }, POLL_INTERVAL);
      }
    }

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [account.instance, account.accessToken, connectionStatus, fetchTimeline]);

  return {
    statuses,
    isLoading,
    isLoadingOlder,
    hasMore,
    error,
    refresh,
    loadOlder,
    connectionStatus,
  };
}
