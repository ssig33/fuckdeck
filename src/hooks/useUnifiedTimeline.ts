import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Account, MastodonStatus, UnifiedStatus, ConnectionStatus } from "../types";
import { getHomeTimeline } from "../utils/mastodon";
import {
  findLimitingSource,
  mergeUnifiedTimeline,
  UnifiedTimelineSource,
} from "../utils/unifiedTimeline";
import { useAccounts } from "./useAccounts";

const POLL_INTERVAL = 60000;
const MAX_RECENT_STATUSES = 200;
const PAGE_SIZE = 40;

interface AccountTimeline {
  recent: MastodonStatus[];
  older: MastodonStatus[];
  hasMore: boolean;
}

const EMPTY_TIMELINE: AccountTimeline = { recent: [], older: [], hasMore: true };

interface UseUnifiedTimelineResult {
  statuses: UnifiedStatus[];
  isLoading: boolean;
  isLoadingOlder: boolean;
  errors: Map<string, string>;
  loadOlder: () => void;
  trimOlder: () => void;
  connectionStatuses: Map<string, ConnectionStatus>;
}

function joinAccountIds(accounts: Account[]): string {
  return accounts.map((a) => a.id).join(",");
}

export function useUnifiedTimeline(accounts: Account[]): UseUnifiedTimelineResult {
  const { streamingStatuses, connectionStatuses, deletedStatusIds } = useAccounts();
  const [timelines, setTimelines] = useState<Map<string, AccountTimeline>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const latestIdsRef = useRef<Map<string, string>>(new Map());
  const isLoadingOlderRef = useRef(false);
  const streamingAccountIdsRef = useRef<Set<string>>(new Set());
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  const accountIds = joinAccountIds(accounts);
  const streamingAccountIds = joinAccountIds(
    accounts.filter((a) => connectionStatuses.get(a.id) === "streaming")
  );
  const pollingAccountIds = joinAccountIds(
    accounts.filter((a) => connectionStatuses.get(a.id) !== "streaming")
  );

  const sources = useMemo<UnifiedTimelineSource[]>(
    () =>
      accounts.map((account) => {
        const timeline = timelines.get(account.id) ?? EMPTY_TIMELINE;
        return {
          account,
          statuses: [
            ...(streamingStatuses.get(account.id) ?? []),
            ...timeline.recent,
            ...timeline.older,
          ],
          deletedIds: deletedStatusIds.get(account.id),
          hasMore: timeline.hasMore,
        };
      }),
    [accounts, timelines, streamingStatuses, deletedStatusIds]
  );

  const statuses = useMemo(() => mergeUnifiedTimeline(sources), [sources]);

  const setError = useCallback((accountId: string, message: string | null) => {
    setErrors((prev) => {
      if (message === null && !prev.has(accountId)) return prev;
      const next = new Map(prev);
      if (message === null) {
        next.delete(accountId);
      } else {
        next.set(accountId, message);
      }
      return next;
    });
  }, []);

  const fetchRecent = useCallback(
    async (targets: Account[], useSinceIds: boolean) => {
      await Promise.all(
        targets.map(async (account) => {
          const sinceId = useSinceIds
            ? latestIdsRef.current.get(account.id)
            : undefined;
          try {
            const fetched = await getHomeTimeline(
              account.instance,
              account.accessToken,
              { sinceId, limit: PAGE_SIZE }
            );
            if (fetched.length > 0) {
              latestIdsRef.current.set(account.id, fetched[0].id);
              setTimelines((prev) => {
                const next = new Map(prev);
                const current = prev.get(account.id) ?? EMPTY_TIMELINE;
                // A full page may not reach back to sinceId; merging would leave a gap.
                if (sinceId && fetched.length < PAGE_SIZE) {
                  next.set(account.id, {
                    ...current,
                    recent: [...fetched, ...current.recent].slice(0, MAX_RECENT_STATUSES),
                  });
                } else {
                  next.set(account.id, { recent: fetched, older: [], hasMore: true });
                }
                return next;
              });
            } else if (!sinceId) {
              setTimelines((prev) =>
                new Map(prev).set(account.id, { recent: [], older: [], hasMore: false })
              );
            }
            setError(account.id, null);
          } catch (err) {
            setError(
              account.id,
              err instanceof Error ? err.message : "Failed to load timeline"
            );
          }
        })
      );
      setIsLoading(false);
    },
    [setError]
  );

  const loadOlder = useCallback(async () => {
    const limiting = findLimitingSource(sources);
    if (isLoadingOlderRef.current || !limiting) {
      return;
    }
    const account = accountsRef.current.find((a) => a.id === limiting.accountId);
    if (!account) return;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    try {
      const older = await getHomeTimeline(account.instance, account.accessToken, {
        maxId: limiting.oldest.id,
        limit: PAGE_SIZE,
      });
      setTimelines((prev) => {
        const current = prev.get(account.id) ?? EMPTY_TIMELINE;
        return new Map(prev).set(
          account.id,
          older.length > 0
            ? { ...current, older: [...current.older, ...older] }
            : { ...current, hasMore: false }
        );
      });
    } catch (err) {
      setError(
        account.id,
        err instanceof Error ? err.message : "Failed to load older statuses"
      );
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [sources, setError]);

  const trimOlder = useCallback(() => {
    setTimelines((prev) => {
      if (Array.from(prev.values()).every((t) => t.older.length === 0)) {
        return prev;
      }
      const next = new Map<string, AccountTimeline>();
      prev.forEach((t, id) => {
        next.set(id, { ...t, older: [], hasMore: t.recent.length > 0 });
      });
      return next;
    });
  }, []);

  useEffect(() => {
    latestIdsRef.current.clear();
    setTimelines(new Map());
    setErrors(new Map());
    setIsLoading(true);
    fetchRecent(accountsRef.current, false);
  }, [accountIds, fetchRecent]);

  useEffect(() => {
    const ids = pollingAccountIds.split(",");
    const targets = accountsRef.current.filter((a) => ids.includes(a.id));
    if (targets.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchRecent(targets, true);
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [pollingAccountIds, fetchRecent]);

  // Streaming does not replay what was sent while the socket was down.
  useEffect(() => {
    const streamingIds = streamingAccountIds.split(",");
    const resumed = accountsRef.current.filter(
      (a) =>
        streamingIds.includes(a.id) &&
        !streamingAccountIdsRef.current.has(a.id) &&
        latestIdsRef.current.has(a.id)
    );
    streamingAccountIdsRef.current = new Set(streamingIds);

    if (resumed.length > 0) {
      fetchRecent(resumed, true);
    }
  }, [streamingAccountIds, fetchRecent]);

  return {
    statuses,
    isLoading,
    isLoadingOlder,
    errors,
    loadOlder,
    trimOlder,
    connectionStatuses,
  };
}
