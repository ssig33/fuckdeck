import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerApp,
  getAuthorizationUrl,
  verifyCredentials,
  getHomeTimeline,
} from "./mastodon";

const mockFetch = vi.fn();
global.fetch = mockFetch;

Object.defineProperty(window, "location", {
  value: {
    origin: "https://example.com",
    pathname: "/",
  },
  writable: true,
});

describe("mastodon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerApp", () => {
    it("registers an app and returns credentials", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          client_id: "test-client-id",
          client_secret: "test-client-secret",
        }),
      });

      const result = await registerApp("mastodon.social");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://mastodon.social/api/v1/apps",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(result).toEqual({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      });
    });
  });

  describe("getAuthorizationUrl", () => {
    it("generates correct authorization URL", () => {
      const url = getAuthorizationUrl("mastodon.social", "my-client-id");

      expect(url).toContain("https://mastodon.social/oauth/authorize");
      expect(url).toContain("client_id=my-client-id");
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=read+write");
    });
  });

  describe("verifyCredentials", () => {
    it("verifies credentials and returns user info", async () => {
      const mockUser = {
        id: "123",
        username: "testuser",
        acct: "testuser",
        display_name: "Test User",
        avatar: "https://example.com/avatar.png",
        avatar_static: "https://example.com/avatar.png",
        url: "https://mastodon.social/@testuser",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const result = await verifyCredentials("mastodon.social", "access-token");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://mastodon.social/api/v1/accounts/verify_credentials",
        expect.objectContaining({
          headers: { Authorization: "Bearer access-token" },
        })
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe("getHomeTimeline", () => {
    it("fetches home timeline", async () => {
      const mockStatuses = [
        {
          id: "1",
          content: "<p>Hello</p>",
          created_at: "2024-01-01T00:00:00.000Z",
          account: { id: "123", username: "user" },
          reblog: null,
          media_attachments: [],
          favourites_count: 0,
          reblogs_count: 0,
          replies_count: 0,
          url: "https://mastodon.social/@user/1",
          spoiler_text: "",
          sensitive: false,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatuses,
      });

      const result = await getHomeTimeline("mastodon.social", "access-token");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://mastodon.social/api/v1/timelines/home",
        expect.objectContaining({
          headers: { Authorization: "Bearer access-token" },
        })
      );
      expect(result).toEqual(mockStatuses);
    });

    it("fetches timeline with sinceId option", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await getHomeTimeline("mastodon.social", "access-token", {
        sinceId: "12345",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://mastodon.social/api/v1/timelines/home?since_id=12345",
        expect.any(Object)
      );
    });
  });
});
