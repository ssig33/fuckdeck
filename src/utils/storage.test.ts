import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadStoredData,
  saveStoredData,
  getAccounts,
  saveAccounts,
  getPendingAuth,
  savePendingAuth,
  clearPendingAuth,
} from "./storage";
import type { Account, PendingAuth, StoredData } from "../types";

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: mockLocalStorage });

describe("storage", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe("loadStoredData / saveStoredData", () => {
    it("returns default data when localStorage is empty", () => {
      const data = loadStoredData();
      expect(data).toEqual({ accounts: [], pendingAuth: null });
    });

    it("saves and loads data correctly", () => {
      const testData: StoredData = {
        accounts: [
          {
            id: "1",
            instance: "mastodon.social",
            accessToken: "token123",
            clientId: "client1",
            clientSecret: "secret1",
            user: null,
          },
        ],
        pendingAuth: null,
      };

      saveStoredData(testData);
      const loaded = loadStoredData();
      expect(loaded).toEqual(testData);
    });
  });

  describe("getAccounts / saveAccounts", () => {
    it("returns empty array when no accounts exist", () => {
      const accounts = getAccounts();
      expect(accounts).toEqual([]);
    });

    it("saves and retrieves accounts", () => {
      const accounts: Account[] = [
        {
          id: "1",
          instance: "mastodon.social",
          accessToken: "token1",
          clientId: "client1",
          clientSecret: "secret1",
          user: null,
        },
        {
          id: "2",
          instance: "mstdn.jp",
          accessToken: "token2",
          clientId: "client2",
          clientSecret: "secret2",
          user: null,
        },
      ];

      saveAccounts(accounts);
      const loaded = getAccounts();
      expect(loaded).toEqual(accounts);
    });
  });

  describe("pendingAuth", () => {
    it("returns null when no pending auth exists", () => {
      const pending = getPendingAuth();
      expect(pending).toBeNull();
    });

    it("saves and retrieves pending auth", () => {
      const auth: PendingAuth = {
        instance: "mastodon.social",
        clientId: "client1",
        clientSecret: "secret1",
      };

      savePendingAuth(auth);
      const loaded = getPendingAuth();
      expect(loaded).toEqual(auth);
    });

    it("clears pending auth", () => {
      const auth: PendingAuth = {
        instance: "mastodon.social",
        clientId: "client1",
        clientSecret: "secret1",
      };

      savePendingAuth(auth);
      clearPendingAuth();
      const loaded = getPendingAuth();
      expect(loaded).toBeNull();
    });
  });
});
