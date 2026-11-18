import { Account, PendingAuth, StoredData, Visibility } from "../types";

const STORAGE_KEY = "fuckdeck_accounts";
const VISIBILITY_KEY = "fuckdeck_visibility";
const UNIFIED_TIMELINE_KEY = "fuckdeck_show_unified_timeline";
const UNIFIED_LOCAL_TIMELINE_KEY = "fuckdeck_show_unified_local_timeline";
const SIDEBAR_COLLAPSED_KEY = "fuckdeck_sidebar_collapsed";

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

export function getShowUnifiedTimeline(): boolean {
  return localStorage.getItem(UNIFIED_TIMELINE_KEY) === "true";
}

export function saveShowUnifiedTimeline(show: boolean): void {
  localStorage.setItem(UNIFIED_TIMELINE_KEY, String(show));
}

export function getShowUnifiedLocalTimeline(): boolean {
  return localStorage.getItem(UNIFIED_LOCAL_TIMELINE_KEY) === "true";
}

export function saveShowUnifiedLocalTimeline(show: boolean): void {
  localStorage.setItem(UNIFIED_LOCAL_TIMELINE_KEY, String(show));
}

export function getDefaultVisibility(accountId: string): Visibility | null {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, Visibility>;
    return map[accountId] ?? null;
  } catch {
    return null;
  }
}

export function saveDefaultVisibility(
  accountId: string,
  visibility: Visibility
): void {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, Visibility>) : {};
    map[accountId] = visibility;
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
}
