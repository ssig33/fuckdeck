import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccountProvider, useAccounts } from "./useAccounts";
import { Account } from "../types";
import { saveAccounts } from "../utils/storage";

vi.mock("../utils/mastodon", () => ({
  getInstanceInfo: vi.fn().mockResolvedValue({
    streamingUrl: "wss://streaming.example.com",
  }),
}));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(event: string, payload: string) {
    this.onmessage?.({ data: JSON.stringify({ event, payload }) });
  }
}

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

function socketFor(accountId: string): FakeWebSocket {
  const socket = FakeWebSocket.instances.find((s) =>
    s.url.includes(`access_token=token-${accountId}`)
  );
  if (!socket) throw new Error(`No socket for ${accountId}`);
  return socket;
}

function wrapper({ children }: { children: ReactNode }) {
  return <AccountProvider>{children}</AccountProvider>;
}

async function renderWithOpenSockets() {
  const view = renderHook(() => useAccounts(), { wrapper });
  await waitFor(() => {
    expect(FakeWebSocket.instances.length).toBe(2);
  });
  act(() => {
    FakeWebSocket.instances.forEach((socket) => socket.onopen?.());
  });
  return view;
}

describe("AccountProvider streaming clients", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    localStorage.clear();
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    saveAccounts([makeAccount("a"), makeAccount("b")]);
  });

  afterEach(() => {
    cleanup();
    globalThis.WebSocket = originalWebSocket;
  });

  it("closes only the removed account's connection", async () => {
    const { result } = await renderWithOpenSockets();

    act(() => {
      result.current.removeAccount("a");
    });

    expect(socketFor("a").closed).toBe(true);
    expect(socketFor("b").closed).toBe(false);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it("keeps connections open when an account is updated", async () => {
    const { result } = await renderWithOpenSockets();

    act(() => {
      result.current.updateAccount({
        ...makeAccount("a"),
        limits: { maxCharacters: 1000, maxMediaAttachments: 4 },
      });
    });

    expect(socketFor("a").closed).toBe(false);
    expect(socketFor("b").closed).toBe(false);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it("forgets the removed account's streaming data", async () => {
    const { result } = await renderWithOpenSockets();

    act(() => {
      socketFor("a").emit(
        "notification",
        JSON.stringify({ id: "1", created_at: "2026-01-01T00:00:00Z" })
      );
      socketFor("a").emit(
        "update",
        JSON.stringify({ id: "s1", created_at: "2026-01-01T00:00:00Z" })
      );
      socketFor("a").emit("delete", "s0");
    });
    expect(result.current.streamingNotifications.length).toBe(1);

    act(() => {
      result.current.removeAccount("a");
    });

    expect(result.current.streamingNotifications).toEqual([]);
    expect(result.current.streamingStatuses.has("a")).toBe(false);
    expect(result.current.deletedStatusIds.has("a")).toBe(false);
    expect(result.current.connectionStatuses.has("a")).toBe(false);
    expect(result.current.connectionStatuses.get("b")).toBe("streaming");
  });

  it("forgets everything when the last account is removed", async () => {
    const { result } = await renderWithOpenSockets();

    act(() => {
      result.current.removeAccount("a");
    });
    act(() => {
      result.current.removeAccount("b");
    });

    expect(socketFor("b").closed).toBe(true);
    expect(result.current.connectionStatuses.size).toBe(0);
  });

  it("records deleted status ids per account", async () => {
    const { result } = await renderWithOpenSockets();

    act(() => {
      socketFor("a").emit(
        "update",
        JSON.stringify({ id: "s1", created_at: "2026-01-01T00:00:00Z" })
      );
    });
    expect(result.current.streamingStatuses.get("a")?.length).toBe(1);

    act(() => {
      socketFor("a").emit("delete", "s1");
    });

    expect(result.current.streamingStatuses.get("a")).toEqual([]);
    expect(result.current.deletedStatusIds.get("a")?.has("s1")).toBe(true);
    expect(result.current.deletedStatusIds.has("b")).toBe(false);
  });

  it("closes all connections on unmount", async () => {
    const { unmount } = await renderWithOpenSockets();

    unmount();

    expect(socketFor("a").closed).toBe(true);
    expect(socketFor("b").closed).toBe(true);
  });
});
