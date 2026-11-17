import { describe, it, expect, vi, afterEach } from "vitest";
import { detectPlatform } from "./api";

const originalFetch = globalThis.fetch;

function serveNodeInfo(software: string | null) {
  globalThis.fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/.well-known/nodeinfo")) {
      return new Response(
        JSON.stringify({ links: [{ href: "https://host.example/nodeinfo/2.1" }] })
      );
    }
    if (software === null) return new Response("", { status: 404 });
    return new Response(JSON.stringify({ software: { name: software } }));
  }) as unknown as typeof fetch;
}

describe("detectPlatform", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("detects Misskey and its forks", async () => {
    serveNodeInfo("misskey");
    expect(await detectPlatform("host.example")).toBe("misskey");
    serveNodeInfo("Sharkey");
    expect(await detectPlatform("host.example")).toBe("misskey");
  });

  it("treats other software as Mastodon", async () => {
    serveNodeInfo("mastodon");
    expect(await detectPlatform("host.example")).toBe("mastodon");
  });

  it("falls back to Mastodon when NodeInfo is unavailable", async () => {
    serveNodeInfo(null);
    expect(await detectPlatform("host.example")).toBe("mastodon");
  });
});
