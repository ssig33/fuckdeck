import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MisskeyNote,
  MisskeyStreamClient,
  MisskeyUser,
  getHomeTimeline,
  mfmToHtml,
  toMastodonNotification,
  toMastodonStatus,
} from "./misskey";

const HOST = "misskey.example";

const alice: MisskeyUser = {
  id: "u1",
  username: "alice",
  host: null,
  name: "Alice :wave:",
  avatarUrl: "https://misskey.example/avatar.png",
};

const bob: MisskeyUser = {
  id: "u2",
  username: "bob",
  host: "remote.example",
  name: null,
  avatarUrl: null,
  emojis: {},
};

function makeNote(overrides: Partial<MisskeyNote> = {}): MisskeyNote {
  return {
    id: "9xyz000001",
    createdAt: "2026-01-01T00:00:00.000Z",
    text: "hello",
    cw: null,
    user: alice,
    visibility: "public",
    renoteId: null,
    files: [],
    ...overrides,
  };
}

describe("mfmToHtml", () => {
  it("escapes HTML and keeps line breaks", () => {
    expect(mfmToHtml("<b>a</b>\nb", HOST)).toBe("<p>&lt;b&gt;a&lt;/b&gt;<br>b</p>");
  });

  it("links URLs and mentions", () => {
    const html = mfmToHtml("see https://x.example/a @bob@remote.example", HOST);
    expect(html).toContain('<a href="https://x.example/a"');
    expect(html).toContain('<a href="https://misskey.example/@bob@remote.example"');
  });

  it("does not treat an e-mail address as a mention", () => {
    expect(mfmToHtml("me@example.com", HOST)).toBe("<p>me@example.com</p>");
  });
});

describe("toMastodonStatus", () => {
  it("maps visibility, cw, files and the author", () => {
    const status = toMastodonStatus(
      makeNote({
        visibility: "home",
        cw: "spoiler",
        user: bob,
        files: [
          {
            id: "f1",
            type: "video/mp4",
            url: "https://misskey.example/f1.mp4",
            thumbnailUrl: null,
            comment: "clip",
            isSensitive: true,
          },
        ],
      }),
      HOST
    );

    expect(status.visibility).toBe("unlisted");
    expect(status.spoiler_text).toBe("spoiler");
    expect(status.sensitive).toBe(true);
    expect(status.media_attachments[0]).toMatchObject({
      type: "video",
      preview_url: "https://misskey.example/f1.mp4",
      description: "clip",
    });
    expect(status.account.acct).toBe("bob@remote.example");
    expect(status.account.url).toBe("https://misskey.example/@bob@remote.example");
  });

  it("gives local notes a uri on the server", () => {
    expect(toMastodonStatus(makeNote(), HOST).uri).toBe(
      "https://misskey.example/notes/9xyz000001"
    );
  });

  it("treats a renote without content as a reblog", () => {
    const original = makeNote({ id: "orig", user: bob, text: "original" });
    const status = toMastodonStatus(
      makeNote({ text: null, renote: original, renoteId: "orig" }),
      HOST
    );

    expect(status.reblog?.id).toBe("orig");
    expect(status.account.username).toBe("alice");
  });

  it("shows a quote as a post with the quoted text", () => {
    const original = makeNote({ id: "orig", user: bob, text: "original" });
    const status = toMastodonStatus(
      makeNote({ text: "my take", renote: original, renoteId: "orig" }),
      HOST
    );

    expect(status.reblog).toBeNull();
    expect(status.content).toContain("my take");
    expect(status.content).toContain("<blockquote>");
    expect(status.content).toContain("original");
  });

  it("uses listed emoji URLs and falls back to the server's emoji path", () => {
    const status = toMastodonStatus(
      makeNote({ text: ":remote: :local:", emojis: { remote: "https://r.example/e.png" } }),
      HOST
    );

    expect(status.emojis.map((e) => [e.shortcode, e.url])).toEqual([
      ["remote", "https://r.example/e.png"],
      ["local", "https://misskey.example/emoji/local.webp"],
    ]);
  });

  it("counts reactions as favourites and my reaction as favourited", () => {
    const status = toMastodonStatus(
      makeNote({ reactions: { "❤": 2, ":x:": 1 }, myReaction: "❤" }),
      HOST
    );

    expect(status.favourites_count).toBe(3);
    expect(status.favourited).toBe(true);
  });
});

describe("toMastodonNotification", () => {
  it("maps a reaction to a favourite with its note", () => {
    const notification = toMastodonNotification(
      { id: "n1", createdAt: "2026-01-01T00:00:00Z", type: "reaction", user: bob, note: makeNote() },
      HOST
    );

    expect(notification?.type).toBe("favourite");
    expect(notification?.status?.id).toBe("9xyz000001");
  });

  it("drops types without a counterpart", () => {
    expect(
      toMastodonNotification(
        { id: "n1", createdAt: "2026-01-01T00:00:00Z", type: "achievementEarned" },
        HOST
      )
    ).toBeNull();
  });
});

describe("getHomeTimeline", () => {
  const originalFetch = globalThis.fetch;
  let lastBody: Record<string, unknown> = {};

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (_url: string, init: RequestInit) => {
      lastBody = JSON.parse(init.body as string);
      // Oldest first, as Misskey may answer.
      const notes = ["9xyz000001", "9xyz000003", "9xyz000002"].map((id) =>
        makeNote({ id })
      );
      return new Response(JSON.stringify(notes), { status: 200 });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends the token and returns newest first", async () => {
    const statuses = await getHomeTimeline(HOST, "tok", { limit: 3 });

    expect(lastBody).toEqual({ i: "tok", limit: 3 });
    expect(statuses.map((s) => s.id)).toEqual(["9xyz000003", "9xyz000002", "9xyz000001"]);
  });

  it("keeps only notes newer than sinceId from the latest page", async () => {
    const statuses = await getHomeTimeline(HOST, "tok", { sinceId: "9xyz000001", limit: 3 });

    expect(lastBody).not.toHaveProperty("sinceId");
    expect(statuses.map((s) => s.id)).toEqual(["9xyz000003", "9xyz000002"]);
  });

  it("pages back with untilId", async () => {
    await getHomeTimeline(HOST, "tok", { maxId: "9xyz000001", limit: 3 });

    expect(lastBody).toEqual({ i: "tok", limit: 3, untilId: "9xyz000001" });
  });
});

describe("MisskeyStreamClient", () => {
  const originalWebSocket = globalThis.WebSocket;
  let socket: {
    url: string;
    sent: string[];
    onopen: (() => void) | null;
    onmessage: ((e: { data: string }) => void) | null;
  };

  beforeEach(() => {
    globalThis.WebSocket = class {
      url: string;
      sent: string[] = [];
      onopen = null;
      onmessage = null;
      onerror = null;
      onclose = null;
      constructor(url: string) {
        this.url = url;
        socket = this as unknown as typeof socket;
      }
      send(data: string) {
        this.sent.push(data);
      }
      close() {}
    } as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it("subscribes to the home timeline and main channels on open", async () => {
    const client = new MisskeyStreamClient(HOST, "tok");
    await client.connect();
    socket.onopen?.();

    expect(socket.url).toBe("wss://misskey.example/streaming?i=tok");
    expect(socket.sent.map((s) => JSON.parse(s).body.channel)).toEqual([
      "homeTimeline",
      "main",
    ]);
    expect(client.getStatus()).toBe("streaming");
  });

  it("delivers notes and notifications as Mastodon events", async () => {
    const client = new MisskeyStreamClient(HOST, "tok");
    const events: { event: string; payload: string }[] = [];
    client.on("event", (e) => events.push(e));
    await client.connect();
    socket.onopen?.();

    const homeId = JSON.parse(socket.sent[0]).body.id;
    const mainId = JSON.parse(socket.sent[1]).body.id;
    socket.onmessage?.({
      data: JSON.stringify({ type: "channel", body: { id: homeId, type: "note", body: makeNote() } }),
    });
    socket.onmessage?.({
      data: JSON.stringify({
        type: "channel",
        body: {
          id: mainId,
          type: "notification",
          body: { id: "n1", createdAt: "2026-01-01T00:00:00Z", type: "follow", user: bob },
        },
      }),
    });

    expect(events.map((e) => e.event)).toEqual(["update", "notification"]);
    expect(JSON.parse(events[0].payload).id).toBe("9xyz000001");
    expect(JSON.parse(events[1].payload).type).toBe("follow");
  });
});
