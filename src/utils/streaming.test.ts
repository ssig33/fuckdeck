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
  sent: string[] = [];
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

  send(data: string) {
    this.sent.push(data);
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

  it("subscribes to the local timeline on open when enabled beforehand", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    client.setLocalTimeline(true);
    await client.connect();
    FakeWebSocket.instances[0].onopen?.();

    expect(FakeWebSocket.instances[0].sent.map((s) => JSON.parse(s))).toEqual([
      { type: "subscribe", stream: "public:local" },
    ]);
  });

  it("subscribes and unsubscribes the local timeline on an open socket", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    await client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();

    client.setLocalTimeline(true);
    client.setLocalTimeline(true);
    client.setLocalTimeline(false);

    expect(socket.sent.map((s) => JSON.parse(s).type)).toEqual([
      "subscribe",
      "unsubscribe",
    ]);
  });

  it("marks events from the local stream", async () => {
    const client = new MastodonStreamClient("example.com", "token");
    const events: unknown[] = [];
    client.on("event", (e) => events.push(e));
    await client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();

    socket.onmessage?.({
      data: JSON.stringify({ stream: ["public:local"], event: "update", payload: "{}" }),
    });
    socket.onmessage?.({
      data: JSON.stringify({ stream: ["user"], event: "update", payload: "{}" }),
    });

    expect(events).toEqual([
      { event: "update", payload: "{}", timeline: "local" },
      { event: "update", payload: "{}" },
    ]);
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
