import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MastodonStreamClient } from "./streaming";
import { getInstanceInfo } from "./mastodon";

vi.mock("./mastodon", () => ({
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
}

describe("MastodonStreamClient", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it("appends the streaming path to the URL advertised by the instance", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();

    expect(FakeWebSocket.instances[0].url).toBe(
      "wss://streaming.example.com/api/v1/streaming?stream=user&access_token=token"
    );
  });

  it("uses the instance host when no streaming URL is advertised", async () => {
    vi.mocked(getInstanceInfo).mockResolvedValueOnce({});

    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();

    expect(FakeWebSocket.instances[0].url).toBe(
      "wss://example.com/api/v1/streaming?stream=user&access_token=token"
    );
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

  it("does not reconnect after disconnect", async () => {
    vi.useFakeTimers();
    try {
      const client = new MastodonStreamClient("example.com", "token");
      await client.connect();

      const socket = FakeWebSocket.instances[0];
      socket.onopen?.();

      client.disconnect();
      expect(socket.closed).toBe(true);
      socket.onclose?.();

      await vi.advanceTimersByTimeAsync(60000);

      expect(FakeWebSocket.instances.length).toBe(1);
      expect(client.getStatus()).toBe("streaming");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not open a socket when disconnected while looking up the instance", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    const connecting = client.connect();

    client.disconnect();
    await connecting;

    expect(FakeWebSocket.instances.length).toBe(0);
  });

  it("opens only one socket when force reconnecting during a pending connect", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    const connecting = client.connect();

    client.forceReconnect();
    await connecting;

    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });
    await new Promise((resolve) => setTimeout(resolve));
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it("falls back to polling when the first connection fails", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();

    const socket = FakeWebSocket.instances[0];
    socket.onerror?.(new Event("error"));
    expect(socket.closed).toBe(true);
    socket.onclose?.();

    expect(client.getStatus()).toBe("polling");
  });

  it("reconnects automatically when an established connection drops", async () => {
    vi.useFakeTimers();
    try {
      const client = new MastodonStreamClient("example.com", "token");
      await client.connect();

      const socket = FakeWebSocket.instances[0];
      socket.onopen?.();
      socket.onclose?.();
      expect(client.getStatus()).toBe("connecting");

      await vi.advanceTimersByTimeAsync(1000);

      expect(FakeWebSocket.instances.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
