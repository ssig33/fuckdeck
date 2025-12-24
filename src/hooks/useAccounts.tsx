import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Account, PendingAuth } from "../types";
import {
  getAccounts,
  saveAccounts,
  getPendingAuth,
  savePendingAuth,
  clearPendingAuth,
} from "../utils/storage";

interface AccountContextValue {
  accounts: Account[];
  pendingAuth: PendingAuth | null;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (account: Account) => void;
  setPendingAuth: (auth: PendingAuth | null) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

interface AccountProviderProps {
  children: ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pendingAuth, setPendingAuthState] = useState<PendingAuth | null>(null);

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

  return (
    <AccountContext.Provider
      value={{
        accounts,
        pendingAuth,
        addAccount,
        removeAccount,
        updateAccount,
        setPendingAuth,
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
