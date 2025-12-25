import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from "react";
import { Account, PendingAuth, MastodonStatus, ConnectionStatus } from "../types";
import { UnifiedNotification } from "../types/notification";
import {
  getAccounts,
  saveAccounts,
  getPendingAuth,
  savePendingAuth,
  clearPendingAuth,
} from "../utils/storage";
import { MastodonStreamClient, parseStreamPayload } from "../utils/streaming";
import { MastodonNotification } from "../types/notification";

interface AccountContextValue {
  accounts: Account[];
  pendingAuth: PendingAuth | null;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (account: Account) => void;
  setPendingAuth: (auth: PendingAuth | null) => void;
  streamingStatuses: Map<string, MastodonStatus[]>;
  streamingNotifications: UnifiedNotification[];
  connectionStatuses: Map<string, ConnectionStatus>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

interface AccountProviderProps {
  children: ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pendingAuth, setPendingAuthState] = useState<PendingAuth | null>(null);
  const [streamingStatuses, setStreamingStatuses] = useState<Map<string, MastodonStatus[]>>(new Map());
  const [streamingNotifications, setStreamingNotifications] = useState<UnifiedNotification[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, ConnectionStatus>>(new Map());
  const streamClientsRef = useRef<Map<string, MastodonStreamClient>>(new Map());

  const accountIds = useMemo(() => accounts.map(a => a.id).join(','), [accounts]);

  useEffect(() => {
    setAccounts(getAccounts());
    setPendingAuthState(getPendingAuth());
  }, []);

  const addAccount = (account: Account) => {
    const newAccounts = [...accounts, account];
    setAccounts(newAccounts);
    saveAccounts(newAccounts);
  };

  const removeAccount = (accountId: string) => {
    const newAccounts = accounts.filter((a) => a.id !== accountId);
    setAccounts(newAccounts);
    saveAccounts(newAccounts);
  };

  const updateAccount = (account: Account) => {
    const newAccounts = accounts.map((a) =>
      a.id === account.id ? account : a
    );
    setAccounts(newAccounts);
    saveAccounts(newAccounts);
  };

  const setPendingAuth = (auth: PendingAuth | null) => {
    setPendingAuthState(auth);
    if (auth) {
      savePendingAuth(auth);
    } else {
      clearPendingAuth();
    }
  };

  useEffect(() => {
    if (!accountIds) {
      return;
    }

    accounts.forEach((account) => {
      const existingClient = streamClientsRef.current.get(account.id);
      if (existingClient) {
        return;
      }

      const streamClient = new MastodonStreamClient(account.instance, account.accessToken);
      streamClientsRef.current.set(account.id, streamClient);

      streamClient.on('statusChange', (status) => {
        setConnectionStatuses((prev) => {
          const next = new Map(prev);
          next.set(account.id, status);
          return next;
        });
      });

      streamClient.on('event', (event) => {
        if (event.event === 'update') {
          const payload = parseStreamPayload(event);
          if (payload && typeof payload !== 'string') {
            const newStatus = payload as MastodonStatus;
            setStreamingStatuses((prev) => {
              const next = new Map(prev);
              const current = next.get(account.id) || [];
              next.set(account.id, [newStatus, ...current]);
              return next;
            });
          }
        } else if (event.event === 'notification') {
          const payload = parseStreamPayload(event);
          if (payload && typeof payload !== 'string') {
            const notification = payload as MastodonNotification;
            const unified: UnifiedNotification = {
              notification,
              targetAccount: account,
            };
            setStreamingNotifications((prev) => [unified, ...prev].sort(
              (a, b) =>
                new Date(b.notification.created_at).getTime() -
                new Date(a.notification.created_at).getTime()
            ));
          }
        } else if (event.event === 'delete') {
          const deletedId = event.payload;
          setStreamingStatuses((prev) => {
            const next = new Map(prev);
            const current = next.get(account.id) || [];
            next.set(account.id, current.filter(s => s.id !== deletedId));
            return next;
          });
        }
      });

      streamClient.connect().catch((error) => {
        console.error(`[AccountProvider] Failed to establish streaming connection for ${account.id}:`, error);
        setConnectionStatuses((prev) => {
          const next = new Map(prev);
          next.set(account.id, 'polling');
          return next;
        });
      });
    });

    const currentAccountIds = new Set(accounts.map(a => a.id));
    streamClientsRef.current.forEach((client, accountId) => {
      if (!currentAccountIds.has(accountId)) {
        client.disconnect();
        streamClientsRef.current.delete(accountId);
        setStreamingStatuses((prev) => {
          const next = new Map(prev);
          next.delete(accountId);
          return next;
        });
        setConnectionStatuses((prev) => {
          const next = new Map(prev);
          next.delete(accountId);
          return next;
        });
      }
    });

    return () => {
      streamClientsRef.current.forEach((client) => {
        client.disconnect();
      });
      streamClientsRef.current.clear();
    };
  }, [accountIds, accounts]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        pendingAuth,
        addAccount,
        removeAccount,
        updateAccount,
        setPendingAuth,
        streamingStatuses,
        streamingNotifications,
        connectionStatuses,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountProvider");
  }
  return context;
}
