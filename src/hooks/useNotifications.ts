import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Account, UnifiedNotification, ConnectionStatus } from "../types";
import { getNotifications } from "../utils/notification";
import { useAccounts } from "./useAccounts";

const POLL_INTERVAL = 60000;

interface UseNotificationsResult {
  notifications: UnifiedNotification[];
  isLoading: boolean;
  errors: Map<string, string>;
  refresh: () => void;
  connectionStatuses: Map<string, ConnectionStatus>;
}

export function useNotifications(accounts: Account[]): UseNotificationsResult {
  const { streamingNotifications, connectionStatuses: contextConnectionStatuses } = useAccounts();
  const [pollingNotifications, setPollingNotifications] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const latestIdsRef = useRef<Map<string, string>>(new Map());
  const pollIntervalsRef = useRef<Map<string, number>>(new Map());

  const accountIds = useMemo(
    () => accounts.map((a) => a.id).join(","),
    [accounts]
  );

  const connectionStatuses = contextConnectionStatuses;

  const notifications = useMemo(() => {
    const notificationMap = new Map<string, UnifiedNotification>();

    [...streamingNotifications, ...pollingNotifications].forEach(item => {
      if (!notificationMap.has(item.notification.id)) {
        notificationMap.set(item.notification.id, item);
      }
    });

    return Array.from(notificationMap.values()).sort(
      (a, b) =>
        new Date(b.notification.created_at).getTime() -
        new Date(a.notification.created_at).getTime()
    );
  }, [streamingNotifications, pollingNotifications]);

  const fetchAll = useCallback(
    async (useSinceIds: boolean) => {
      if (accounts.length === 0) {
        setIsLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        accounts.map(async (account) => {
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

      const newErrors = new Map<string, string>();
      const newNotifications: UnifiedNotification[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          newNotifications.push(...result.value);
        } else {
          newErrors.set(
            accounts[index].id,
            result.reason?.message ?? "Unknown error"
          );
        }
      });

      setErrors(newErrors);

      if (useSinceIds && newNotifications.length > 0) {
        setPollingNotifications((prev) => [...newNotifications, ...prev]);
      } else if (!useSinceIds) {
        setPollingNotifications(newNotifications);
      }

      setIsLoading(false);
    },
    [accounts]
  );

  const refresh = useCallback(() => {
    setIsLoading(true);
    latestIdsRef.current.clear();
    fetchAll(false);
  }, [fetchAll]);

  useEffect(() => {
    latestIdsRef.current.clear();
    setPollingNotifications([]);
    setIsLoading(true);
    fetchAll(false);

    const hasStreamingAccount = accounts.some(
      account => connectionStatuses.get(account.id) === 'streaming'
    );

    if (!hasStreamingAccount) {
      pollIntervalsRef.current.forEach(id => clearInterval(id));
      pollIntervalsRef.current.clear();

      const intervalId = window.setInterval(() => {
        fetchAll(true);
      }, POLL_INTERVAL);
      pollIntervalsRef.current.set('all', intervalId);
    } else {
      accounts.forEach((account) => {
        const status = connectionStatuses.get(account.id);
        if (status !== 'streaming') {
          if (!pollIntervalsRef.current.has(account.id)) {
            const intervalId = window.setInterval(() => {
              fetchAll(true);
            }, POLL_INTERVAL);
            pollIntervalsRef.current.set(account.id, intervalId);
          }
        } else {
          const intervalId = pollIntervalsRef.current.get(account.id);
          if (intervalId !== undefined) {
            clearInterval(intervalId);
            pollIntervalsRef.current.delete(account.id);
          }
        }
      });
    }

    return () => {
      pollIntervalsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      pollIntervalsRef.current.clear();
    };
  }, [accountIds, connectionStatuses, fetchAll]);

  return { notifications, isLoading, errors, refresh, connectionStatuses };
}
