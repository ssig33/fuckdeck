import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useUnifiedTimeline } from "./useUnifiedTimeline";
import { getHomeTimeline, getLocalTimeline } from "../utils/mastodon";
import { useAccounts } from "./useAccounts";
import { Account, ConnectionStatus, MastodonStatus } from "../types";

vi.mock("../utils/mastodon", () => ({
  getHomeTimeline: vi.fn(),
  getLocalTimeline: vi.fn(),
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

const a = makeAccount("a");
const b = makeAccount("b");
const accounts = [a, b];

function makeStatus(id: string, minute: number): MastodonStatus {
  return {
    id,
    uri: `uri-${id}`,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString(),
  } as MastodonStatus;
}

const setLocalTimelineStreaming = vi.fn();

function setContext(
  status: ConnectionStatus,
  streamed: Map<string, MastodonStatus[]> = new Map(),
  localStreamed: Map<string, MastodonStatus[]> = new Map()
) {
  vi.mocked(useAccounts).mockReturnValue({
    streamingStatuses: streamed,
    localStreamingStatuses: localStreamed,
    setLocalTimelineStreaming,
    connectionStatuses: new Map(accounts.map((acc) => [acc.id, status])),
    deletedStatusIds: new Map(),
  } as unknown as ReturnType<typeof useAccounts>);
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("useUnifiedTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getHomeTimeline).mockReset();
    vi.mocked(getLocalTimeline).mockReset();
    setLocalTimelineStreaming.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("merges fetched and streamed statuses of all accounts", async () => {
    setContext("streaming", new Map([["b", [makeStatus("b9", 9)]]]));
    vi.mocked(getHomeTimeline).mockImplementation(async (instance) =>
      instance === a.instance
        ? [makeStatus("a5", 5), makeStatus("a2", 2)]
        : [makeStatus("b3", 3)]
    );

    const { result } = renderHook(() => useUnifiedTimeline(accounts));
    await flush();

    expect(result.current.statuses.map((s) => s.status.id)).toEqual([
      "b9",
      "a5",
      "b3",
    ]);
  });

  it("polls each account with its own since_id", async () => {
    setContext("polling");
    vi.mocked(getHomeTimeline).mockImplementation(async (instance, _t, options = {}) => {
      if (options.sinceId) return [];
      return instance === a.instance ? [makeStatus("a5", 5)] : [makeStatus("b3", 3)];
    });

    renderHook(() => useUnifiedTimeline(accounts));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    });

    expect(getHomeTimeline).toHaveBeenCalledWith(a.instance, a.accessToken, {
      sinceId: "a5",
      limit: 40,
    });
    expect(getHomeTimeline).toHaveBeenCalledWith(b.instance, b.accessToken, {
      sinceId: "b3",
      limit: 40,
    });
  });

  it("loads older statuses from the account that ends first", async () => {
    setContext("streaming");
    vi.mocked(getHomeTimeline).mockImplementation(async (instance, _t, options = {}) => {
      if (options.maxId) return [makeStatus("a1", 1)];
      return instance === a.instance
        ? [makeStatus("a6", 6), makeStatus("a4", 4)]
        : [makeStatus("b5", 5), makeStatus("b2", 2)];
    });

    const { result } = renderHook(() => useUnifiedTimeline(accounts));
    await flush();
    expect(result.current.statuses.map((s) => s.status.id)).toEqual([
      "a6",
      "b5",
      "a4",
    ]);

    await act(async () => {
      result.current.loadOlder();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(getHomeTimeline).toHaveBeenLastCalledWith(a.instance, a.accessToken, {
      maxId: "a4",
      limit: 40,
    });
    expect(result.current.statuses.map((s) => s.status.id)).toEqual([
      "a6",
      "b5",
      "a4",
      "b2",
    ]);
  });

  it("shows local timelines and streams them only while mounted", async () => {
    setContext(
      "streaming",
      new Map([["a", [makeStatus("home", 9)]]]),
      new Map([["b", [makeStatus("b9", 9)]]])
    );
    vi.mocked(getLocalTimeline).mockImplementation(async (instance) =>
      instance === a.instance ? [makeStatus("a5", 5)] : [makeStatus("b6", 6), makeStatus("b4", 4)]
    );

    const { result, unmount } = renderHook(() => useUnifiedTimeline(accounts, "local"));
    await flush();

    expect(getHomeTimeline).not.toHaveBeenCalled();
    expect(result.current.statuses.map((s) => s.status.id)).toEqual(["b9", "b6", "a5"]);
    expect(setLocalTimelineStreaming).toHaveBeenLastCalledWith(true);

    unmount();
    expect(setLocalTimelineStreaming).toHaveBeenLastCalledWith(false);
  });

  it("does not stream the local timeline for the home timeline", async () => {
    setContext("streaming");
    vi.mocked(getHomeTimeline).mockResolvedValue([]);

    renderHook(() => useUnifiedTimeline(accounts));
    await flush();

    expect(setLocalTimelineStreaming).not.toHaveBeenCalled();
  });
});
