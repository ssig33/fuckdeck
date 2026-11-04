import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Account, UnifiedNotification, ConnectionStatus } from "../types";
import { getNotifications } from "../utils/notification";
import { useAccounts } from "./useAccounts";

const POLL_INTERVAL = 60000;
const MAX_POLLING_NOTIFICATIONS = 200;

function byNewest(a: UnifiedNotification, b: UnifiedNotification): number {
  return (
    new Date(b.notification.created_at).getTime() -
    new Date(a.notification.created_at).getTime()
  );
}

function joinAccountIds(accounts: Account[]): string {
  return accounts.map((a) => a.id).join(",");
}

interface UseNotificationsResult {
  notifications: UnifiedNotification[];
  isLoading: boolean;
  errors: Map<string, string>;
  refresh: () => void;
  connectionStatuses: Map<string, ConnectionStatus>;
}

export function useNotifications(accounts: Account[]): UseNotificationsResult {
  const { streamingNotifications, connectionStatuses } = useAccounts();
  const [pollingNotifications, setPollingNotifications] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const latestIdsRef = useRef<Map<string, string>>(new Map());
  const streamingAccountIdsRef = useRef<Set<string>>(new Set());

  const streamingAccountIds = joinAccountIds(
    accounts.filter((a) => connectionStatuses.get(a.id) === "streaming")
  );
  const pollingAccountIds = joinAccountIds(
    accounts.filter((a) => connectionStatuses.get(a.id) !== "streaming")
  );

  const notifications = useMemo(() => {
    const notificationMap = new Map<string, UnifiedNotification>();

    [...streamingNotifications, ...pollingNotifications].forEach(item => {
      // Notification ids are only unique within an instance.
      const key = `${item.targetAccount.id}:${item.notification.id}`;
      if (!notificationMap.has(key)) {
        notificationMap.set(key, item);
      }
    });

    return Array.from(notificationMap.values()).sort(byNewest);
  }, [streamingNotifications, pollingNotifications]);

  const fetchNotifications = useCallback(
    async (targets: Account[], useSinceIds: boolean) => {
      if (targets.length === 0) {
        setIsLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        targets.map(async (account) => {
          const sinceId = useSinceIds
            ? latestIdsRef.current.get(account.id)
            : undefined;
          const rawNotifications = await getNotifications(
            account.instance,
            account.accessToken,
            { sinceId, limit: 30 }
          );

          if (rawNotifications.length > 0) {
            latestIdsRef.current.set(account.id, rawNotifications[0].id);
          }

          return rawNotifications.map((notification) => ({
            notification,
            targetAccount: account,
          }));
        })
      );

      const newNotifications: UnifiedNotification[] = [];

      setErrors((prev) => {
        const next = new Map(useSinceIds ? prev : []);
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            next.set(
              targets[index].id,
              result.reason?.message ?? "Unknown error"
            );
          } else {
            next.delete(targets[index].id);
          }
        });
        return next;
      });

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          newNotifications.push(...result.value);
        }
      });

      if (useSinceIds && newNotifications.length > 0) {
        setPollingNotifications((prev) =>
          [...newNotifications, ...prev]
            .sort(byNewest)
            .slice(0, MAX_POLLING_NOTIFICATIONS)
        );
      } else if (!useSinceIds) {
        setPollingNotifications(newNotifications);
      }

      setIsLoading(false);
    },
    []
  );

  const refresh = useCallback(() => {
    setIsLoading(true);
    latestIdsRef.current.clear();
    fetchNotifications(accounts, false);
  }, [accounts, fetchNotifications]);

  useEffect(() => {
    latestIdsRef.current.clear();
    setPollingNotifications([]);
    setIsLoading(true);
    fetchNotifications(accounts, false);
  }, [accounts, fetchNotifications]);

  useEffect(() => {
    const targets = accounts.filter((a) =>
      pollingAccountIds.split(",").includes(a.id)
    );
    if (targets.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchNotifications(targets, true);
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [accounts, pollingAccountIds, fetchNotifications]);

  // Streaming does not replay what was sent while the socket was down.
  useEffect(() => {
    const streamingIds = streamingAccountIds.split(",");
    const resumed = accounts.filter(
      (a) =>
        streamingIds.includes(a.id) &&
        !streamingAccountIdsRef.current.has(a.id) &&
        latestIdsRef.current.has(a.id)
    );
    streamingAccountIdsRef.current = new Set(streamingIds);

    if (resumed.length > 0) {
      fetchNotifications(resumed, true);
    }
  }, [accounts, streamingAccountIds, fetchNotifications]);

  return { notifications, isLoading, errors, refresh, connectionStatuses };
}
