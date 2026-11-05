import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useTimeline } from "./useTimeline";
import { getHomeTimeline } from "../utils/mastodon";
import { useAccounts } from "./useAccounts";
import { Account, ConnectionStatus, MastodonStatus } from "../types";

vi.mock("../utils/mastodon", () => ({
  getHomeTimeline: vi.fn(),
}));

vi.mock("./useAccounts", () => ({
  useAccounts: vi.fn(),
}));

const POLL_INTERVAL = 60000;

const account: Account = {
  id: "a",
  instance: "a.example.com",
  accessToken: "token-a",
  clientId: "client",
  clientSecret: "secret",
  user: null,
};

function makeStatus(id: string, minute = 0): MastodonStatus {
  return {
    id,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString(),
  } as MastodonStatus;
}

function setContext(
  status: ConnectionStatus,
  deleted: string[] = [],
  streamed: MastodonStatus[] = []
) {
  vi.mocked(useAccounts).mockReturnValue({
    streamingStatuses: new Map([[account.id, streamed]]),
    connectionStatuses: new Map([[account.id, status]]),
    deletedStatusIds: new Map([[account.id, new Set(deleted)]]),
  } as unknown as ReturnType<typeof useAccounts>);
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("useTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getHomeTimeline).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps polling when the first fetch returns nothing", async () => {
    setContext("polling");
    vi.mocked(getHomeTimeline).mockResolvedValueOnce([]);
    vi.mocked(getHomeTimeline).mockResolvedValueOnce([makeStatus("1")]);

    const { result } = renderHook(() => useTimeline(account));
    await flush();
    expect(result.current.statuses).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    });

    expect(result.current.statuses.map((s) => s.id)).toEqual(["1"]);
  });

  it("polls with since_id once a status is known", async () => {
    setContext("polling");
    vi.mocked(getHomeTimeline).mockResolvedValueOnce([makeStatus("1")]);
    vi.mocked(getHomeTimeline).mockResolvedValueOnce([]);

    renderHook(() => useTimeline(account));
    await flush();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    });

    expect(getHomeTimeline).toHaveBeenLastCalledWith(
      account.instance,
      account.accessToken,
      { sinceId: "1", limit: 40 }
    );
  });

  it("hides deleted statuses that came from fetching", async () => {
    setContext("streaming");
    vi.mocked(getHomeTimeline).mockResolvedValue([
      makeStatus("2", 2),
      makeStatus("1", 1),
    ]);

    const { result, rerender } = renderHook(() => useTimeline(account));
    await flush();
    expect(result.current.statuses.map((s) => s.id)).toEqual(["2", "1"]);

    setContext("streaming", ["2"]);
    rerender();

    expect(result.current.statuses.map((s) => s.id)).toEqual(["1"]);
  });

  it("hides deleted statuses that came from loading older pages", async () => {
    setContext("streaming");
    vi.mocked(getHomeTimeline).mockResolvedValueOnce([makeStatus("5", 5)]);
    vi.mocked(getHomeTimeline).mockResolvedValueOnce([makeStatus("1", 1)]);

    const { result, rerender } = renderHook(() => useTimeline(account));
    await flush();

    await act(async () => {
      result.current.loadOlder();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.statuses.map((s) => s.id)).toEqual(["5", "1"]);

    setContext("streaming", ["1"]);
    rerender();

    expect(result.current.statuses.map((s) => s.id)).toEqual(["5"]);
  });
});
