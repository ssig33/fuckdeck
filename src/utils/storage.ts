import { Account, PendingAuth, StoredData } from "../types";

const STORAGE_KEY = "fuckdeck_accounts";

const DEFAULT_DATA: StoredData = {
  accounts: [],
  pendingAuth: null,
};

export function loadStoredData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_DATA };
    }
    const data = JSON.parse(raw) as StoredData;
    return {
      accounts: data.accounts ?? [],
      pendingAuth: data.pendingAuth ?? null,
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveStoredData(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAccounts(): Account[] {
  return loadStoredData().accounts;
}

export function saveAccounts(accounts: Account[]): void {
  const data = loadStoredData();
  data.accounts = accounts;
  saveStoredData(data);
}

export function addAccount(account: Account): void {
  const accounts = getAccounts();
  accounts.push(account);
  saveAccounts(accounts);
}

export function removeAccount(accountId: string): void {
  const accounts = getAccounts().filter((a) => a.id !== accountId);
  saveAccounts(accounts);
}

export function getPendingAuth(): PendingAuth | null {
  return loadStoredData().pendingAuth;
}

export function savePendingAuth(auth: PendingAuth): void {
  const data = loadStoredData();
  data.pendingAuth = auth;
  saveStoredData(data);
}

export function clearPendingAuth(): void {
  const data = loadStoredData();
  data.pendingAuth = null;
  saveStoredData(data);
}
