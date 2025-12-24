import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Account, UnifiedNotification } from "../types";
import { getNotifications } from "../utils/notification";

const POLL_INTERVAL = 60000;

interface UseNotificationsResult {
  notifications: UnifiedNotification[];
  isLoading: boolean;
  errors: Map<string, string>;
  refresh: () => void;
}

export function useNotifications(accounts: Account[]): UseNotificationsResult {
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const latestIdsRef = useRef<Map<string, string>>(new Map());

  const accountIds = useMemo(
    () => accounts.map((a) => a.id).join(","),
    [accounts]
  );

  const sortNotifications = useCallback(
    (items: UnifiedNotification[]): UnifiedNotification[] => {
      return [...items].sort(
        (a, b) =>
          new Date(b.notification.created_at).getTime() -
          new Date(a.notification.created_at).getTime()
      );
    },
    []
  );

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
        setNotifications((prev) =>
          sortNotifications([...newNotifications, ...prev])
        );
      } else if (!useSinceIds) {
        setNotifications(sortNotifications(newNotifications));
      }

      setIsLoading(false);
    },
    [accounts, sortNotifications]
  );

  const refresh = useCallback(() => {
    setIsLoading(true);
    latestIdsRef.current.clear();
    fetchAll(false);
  }, [fetchAll]);

  useEffect(() => {
    latestIdsRef.current.clear();
    setNotifications([]);
    setIsLoading(true);
    fetchAll(false);

    const intervalId = setInterval(() => {
      fetchAll(true);
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [accountIds]);

  return { notifications, isLoading, errors, refresh };
}
