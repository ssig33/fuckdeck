import { useState, useEffect, useCallback, useRef } from "react";
import { Account, MastodonStatus } from "../types";
import { getHomeTimeline } from "../utils/mastodon";

const POLL_INTERVAL = 60000;

interface UseTimelineResult {
  statuses: MastodonStatus[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTimeline(account: Account): UseTimelineResult {
  const [statuses, setStatuses] = useState<MastodonStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestIdRef = useRef<string | null>(null);

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
            setStatuses((prev) => [...newStatuses, ...prev]);
          } else {
            setStatuses(newStatuses);
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

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchTimeline();
  }, [fetchTimeline]);

  useEffect(() => {
    fetchTimeline();

    const intervalId = setInterval(() => {
      if (latestIdRef.current) {
        fetchTimeline(latestIdRef.current);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchTimeline]);

  return { statuses, isLoading, error, refresh };
}
