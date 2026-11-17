import {
  Account,
  InstanceLimits,
  MastodonStatus,
  MediaAttachment,
  Platform,
  PostStatusOptions,
} from "../types";
import { MastodonNotification } from "../types/notification";
import * as mastodon from "./mastodon";
import * as misskey from "./misskey";
import { getNotifications as getMastodonNotifications } from "./notification";
import { MastodonStreamClient, StreamClient } from "./streaming";

// Every call that depends on the server's API goes through here, so the
// rest of the app works with Mastodon shapes whatever the server is.

export interface PageOptions {
  sinceId?: string;
  maxId?: string;
  limit?: number;
}

function isMisskey(account: Pick<Account, "platform">): boolean {
  return account.platform === "misskey";
}

// Servers whose native API is Misskey's.
const MISSKEY_SOFTWARE = new Set([
  "misskey",
  "sharkey",
  "cherrypick",
  "firefish",
  "calckey",
  "foundkey",
]);

/** Finds which API the server speaks from its NodeInfo. Defaults to Mastodon. */
export async function detectPlatform(instance: string): Promise<Platform> {
  try {
    const index = await fetch(`https://${instance}/.well-known/nodeinfo`);
    if (!index.ok) return "mastodon";
    const links: { href: string }[] = (await index.json())?.links ?? [];
    const href = links[links.length - 1]?.href;
    if (!href) return "mastodon";
    const nodeinfo = await fetch(href);
    if (!nodeinfo.ok) return "mastodon";
    const name = String((await nodeinfo.json())?.software?.name ?? "").toLowerCase();
    return MISSKEY_SOFTWARE.has(name) ? "misskey" : "mastodon";
  } catch {
    return "mastodon";
  }
}

export function getHomeTimeline(
  account: Account,
  options: PageOptions = {}
): Promise<MastodonStatus[]> {
  return isMisskey(account)
    ? misskey.getHomeTimeline(account.instance, account.accessToken, options)
    : mastodon.getHomeTimeline(account.instance, account.accessToken, options);
}

export function getNotifications(
  account: Account,
  options: PageOptions = {}
): Promise<MastodonNotification[]> {
  return isMisskey(account)
    ? misskey.getNotifications(account.instance, account.accessToken, options)
    : getMastodonNotifications(account.instance, account.accessToken, options);
}

export function postStatus(
  account: Account,
  options: PostStatusOptions
): Promise<MastodonStatus> {
  return isMisskey(account)
    ? misskey.postStatus(account.instance, account.accessToken, options)
    : mastodon.postStatus(account.instance, account.accessToken, options);
}

export function uploadMedia(account: Account, file: File): Promise<MediaAttachment> {
  return isMisskey(account)
    ? misskey.uploadMedia(account.instance, account.accessToken, file)
    : mastodon.uploadMedia(account.instance, account.accessToken, file);
}

export type StatusAction = "favourite" | "unfavourite" | "reblog" | "unreblog";

export async function statusAction(
  account: Account,
  statusId: string,
  action: StatusAction
): Promise<void> {
  const { instance, accessToken } = account;
  if (isMisskey(account)) {
    const run = {
      favourite: misskey.favouriteStatus,
      unfavourite: misskey.unfavouriteStatus,
      reblog: misskey.reblogStatus,
      unreblog: misskey.unreblogStatus,
    }[action];
    await run(instance, accessToken, statusId);
  } else {
    const run = {
      favourite: mastodon.favouriteStatus,
      unfavourite: mastodon.unfavouriteStatus,
      reblog: mastodon.reblogStatus,
      unreblog: mastodon.unreblogStatus,
    }[action];
    await run(instance, accessToken, statusId);
  }
}

/**
 * Returns the id that `account`'s server uses for `status`, which was
 * fetched from `sourceInstance`.
 */
export function resolveStatusId(
  account: Account,
  status: MastodonStatus,
  sourceInstance: string
): Promise<string> {
  if (account.instance === sourceInstance) {
    return Promise.resolve(status.id);
  }
  return isMisskey(account)
    ? misskey.findNoteId(account.instance, account.accessToken, status.uri)
    : mastodon.resolveStatusId(account.instance, account.accessToken, status, sourceInstance);
}

export function getInstanceLimits(
  account: Pick<Account, "instance" | "platform">
): Promise<InstanceLimits> {
  return isMisskey(account)
    ? misskey.getInstanceLimits(account.instance)
    : mastodon.getInstanceLimits(account.instance);
}

export function createStreamClient(account: Account): StreamClient {
  return isMisskey(account)
    ? new misskey.MisskeyStreamClient(account.instance, account.accessToken)
    : new MastodonStreamClient(account.instance, account.accessToken);
}
