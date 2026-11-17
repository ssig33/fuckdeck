import { describe, it, expect } from "vitest";
import { findLimitingSource, mergeUnifiedTimeline } from "./unifiedTimeline";
import { Account, MastodonStatus } from "../types";

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

function makeStatus(id: string, minute: number, uri = `uri-${id}`): MastodonStatus {
  return {
    id,
    uri,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString(),
  } as MastodonStatus;
}

const a = makeAccount("a");
const b = makeAccount("b");

describe("mergeUnifiedTimeline", () => {
  it("merges accounts newest first and remembers the source account", () => {
    const result = mergeUnifiedTimeline([
      { account: a, statuses: [makeStatus("a2", 3), makeStatus("a1", 1)], hasMore: false },
      { account: b, statuses: [makeStatus("b1", 2)], hasMore: false },
    ]);

    expect(result.map((r) => [r.status.id, r.sourceAccount.id])).toEqual([
      ["a2", "a"],
      ["b1", "b"],
      ["a1", "a"],
    ]);
  });

  it("shows a post seen by several accounts once", () => {
    const result = mergeUnifiedTimeline([
      { account: a, statuses: [makeStatus("100", 1, "shared")], hasMore: false },
      { account: b, statuses: [makeStatus("900", 1, "shared")], hasMore: false },
    ]);

    expect(result.map((r) => [r.status.id, r.sourceAccount.id])).toEqual([
      ["100", "a"],
    ]);
  });

  it("hides deleted statuses", () => {
    const result = mergeUnifiedTimeline([
      {
        account: a,
        statuses: [makeStatus("2", 2), makeStatus("1", 1)],
        deletedIds: new Set(["2"]),
        hasMore: false,
      },
    ]);

    expect(result.map((r) => r.status.id)).toEqual(["1"]);
  });

  it("hides statuses older than what every account has loaded", () => {
    const result = mergeUnifiedTimeline([
      { account: a, statuses: [makeStatus("a2", 10), makeStatus("a1", 1)], hasMore: true },
      { account: b, statuses: [makeStatus("b2", 9), makeStatus("b1", 5)], hasMore: true },
    ]);

    expect(result.map((r) => r.status.id)).toEqual(["a2", "b2", "b1"]);
  });

  it("does not cut at an account whose history is fully loaded", () => {
    const result = mergeUnifiedTimeline([
      { account: a, statuses: [makeStatus("a2", 10), makeStatus("a1", 1)], hasMore: true },
      { account: b, statuses: [makeStatus("b1", 5)], hasMore: false },
    ]);

    expect(result.map((r) => r.status.id)).toEqual(["a2", "b1", "a1"]);
  });
});

describe("findLimitingSource", () => {
  it("picks the account whose oldest loaded status is newest", () => {
    const result = findLimitingSource([
      { account: a, statuses: [makeStatus("a2", 10), makeStatus("a1", 1)], hasMore: true },
      { account: b, statuses: [makeStatus("b2", 9), makeStatus("b1", 5)], hasMore: true },
    ]);

    expect(result).toEqual({ accountId: "b", oldest: makeStatus("b1", 5) });
  });

  it("returns null when every account is fully loaded", () => {
    expect(
      findLimitingSource([
        { account: a, statuses: [makeStatus("a1", 1)], hasMore: false },
      ])
    ).toBeNull();
  });
});
