import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useNotifications } from "./useNotifications";
import { getNotifications } from "../utils/notification";
import { useAccounts } from "./useAccounts";
import {
  Account,
  ConnectionStatus,
  MastodonNotification,
  UnifiedNotification,
} from "../types";

vi.mock("../utils/notification", () => ({
  getNotifications: vi.fn(),
}));

vi.mock("./useAccounts", () => ({
  useAccounts: vi.fn(),
}));

const POLL_INTERVAL = 60000;

function makeAccount(id: string): Account {
  return {
    id,
    instance: `${id}.example.com`,
    accessToken: `token-${id}`,
    clientId: "client",
    clientSecret: "secret",
    user: null,
  };
}

function makeNotification(id: string, minute = 0): MastodonNotification {
  return {
    id,
    type: "follow",
    created_at: new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString(),
    account: {} as MastodonNotification["account"],
  };
}

function setContext(
  statuses: Record<string, ConnectionStatus>,
  streamingNotifications: UnifiedNotification[] = []
) {
  vi.mocked(useAccounts).mockReturnValue({
    streamingNotifications,
    connectionStatuses: new Map(Object.entries(statuses)),
  } as unknown as ReturnType<typeof useAccounts>);
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advancePollInterval() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
  });
}

function fetchedInstances(): string[] {
  return vi.mocked(getNotifications).mock.calls.map(([instance]) => instance);
}

describe("useNotifications", () => {
  const a = makeAccount("a");
  const b = makeAccount("b");
  const accounts = [a, b];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getNotifications).mockReset();
    vi.mocked(getNotifications).mockImplementation(
      async (instance, _token, options) => {
        if (options?.sinceId) return [];
        return [makeNotification("1", instance === a.instance ? 1 : 2)];
      }
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps notifications that share an id across accounts", async () => {
    setContext({ a: "streaming", b: "streaming" });

    const { result } = renderHook(() => useNotifications(accounts));
    await flush();

    expect(
      result.current.notifications.map((item) => item.targetAccount.id)
    ).toEqual(["b", "a"]);
  });

  it("removes a notification received from both streaming and polling", async () => {
    setContext({ a: "streaming", b: "streaming" }, [
      { notification: makeNotification("1", 1), targetAccount: a },
    ]);

    const { result } = renderHook(() => useNotifications(accounts));
    await flush();

    expect(result.current.notifications.length).toBe(2);
  });

  it("keeps the list and does not refetch when a connection status changes", async () => {
    setContext({ a: "connecting", b: "connecting" });

    const { result, rerender } = renderHook(() => useNotifications(accounts));
    await flush();
    expect(result.current.notifications.length).toBe(2);
    vi.mocked(getNotifications).mockClear();

    setContext({ a: "polling", b: "connecting" });
    rerender();
    expect(result.current.notifications.length).toBe(2);
    await flush();

    expect(getNotifications).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("polls each non-streaming account once per interval", async () => {
    setContext({ a: "polling", b: "polling" });

    renderHook(() => useNotifications(accounts));
    await flush();
    vi.mocked(getNotifications).mockClear();

    await advancePollInterval();

    expect(fetchedInstances().sort()).toEqual([a.instance, b.instance]);
  });

  it("does not poll streaming accounts", async () => {
    setContext({ a: "streaming", b: "polling" });

    renderHook(() => useNotifications(accounts));
    await flush();
    vi.mocked(getNotifications).mockClear();

    await advancePollInterval();

    expect(fetchedInstances()).toEqual([b.instance]);
  });

  it("does not poll when every account is streaming", async () => {
    setContext({ a: "streaming", b: "streaming" });

    renderHook(() => useNotifications(accounts));
    await flush();
    vi.mocked(getNotifications).mockClear();

    await advancePollInterval();

    expect(getNotifications).not.toHaveBeenCalled();
  });

  it("fetches what was missed when an account starts streaming again", async () => {
    setContext({ a: "streaming", b: "streaming" });

    const { rerender } = renderHook(() => useNotifications(accounts));
    await flush();

    setContext({ a: "connecting", b: "streaming" });
    rerender();
    await flush();
    vi.mocked(getNotifications).mockClear();

    setContext({ a: "streaming", b: "streaming" });
    rerender();
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(getNotifications).toHaveBeenCalledWith(a.instance, a.accessToken, {
      sinceId: "1",
      limit: 30,
    });
  });

  it("keeps the error of an account that was not part of a poll", async () => {
    setContext({ a: "streaming", b: "polling" });
    vi.mocked(getNotifications).mockImplementation(async (instance) => {
      if (instance === a.instance) throw new Error("boom");
      return [];
    });

    const { result } = renderHook(() => useNotifications(accounts));
    await flush();
    expect(result.current.errors.get("a")).toBe("boom");

    await advancePollInterval();

    expect(result.current.errors.get("a")).toBe("boom");
  });

  it("limits how many polled notifications are kept", async () => {
    setContext({ a: "polling", b: "streaming" });
    let next = 1000;
    vi.mocked(getNotifications).mockImplementation(
      async (instance, _token, options) => {
        if (instance !== a.instance) return [];
        if (!options?.sinceId) return [makeNotification("999")];
        return Array.from({ length: 30 }, () =>
          makeNotification(String(next++), next % 60)
        );
      }
    );

    const { result } = renderHook(() => useNotifications(accounts));
    await flush();

    for (let i = 0; i < 10; i++) {
      await advancePollInterval();
    }

    expect(result.current.notifications.length).toBe(200);
  });
});
