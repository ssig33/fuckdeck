import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MastodonStreamClient } from "./streaming";

vi.mock("./mastodon", () => ({
  getInstanceInfo: vi.fn().mockResolvedValue({
    streamingUrl: "wss://example.com/api/v1/streaming",
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
}

describe("MastodonStreamClient.forceReconnect", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it("closes the current socket and opens a new one", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();

    const first = FakeWebSocket.instances[0];
    first.onopen?.();
    expect(client.getStatus()).toBe("streaming");

    client.forceReconnect();

    expect(first.closed).toBe(true);
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(2);
    });

    const second = FakeWebSocket.instances[1];
    second.onopen?.();
    expect(client.getStatus()).toBe("streaming");
  });

  it("detaches handlers from the old socket so its close does not interfere", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();

    const first = FakeWebSocket.instances[0];
    first.onopen?.();

    client.forceReconnect();

    expect(first.onopen).toBeNull();
    expect(first.onmessage).toBeNull();
    expect(first.onerror).toBeNull();
    expect(first.onclose).toBeNull();
  });

  it("reconnects even after falling back to polling", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();

    const first = FakeWebSocket.instances[0];
    first.onclose?.();
    expect(client.getStatus()).toBe("polling");

    client.forceReconnect();

    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(2);
    });

    const second = FakeWebSocket.instances[1];
    second.onopen?.();
    expect(client.getStatus()).toBe("streaming");
  });
});
