import { MastodonNotification } from "../types";
import { authorizedRequest } from "./mastodon";

export interface GetNotificationsOptions {
  sinceId?: string;
  limit?: number;
}

export function getNotifications(
  instance: string,
  token: string,
  options: GetNotificationsOptions = {}
): Promise<MastodonNotification[]> {
  const url = new URL(`https://${instance}/api/v1/notifications`);
  if (options.sinceId) {
    url.searchParams.set("since_id", options.sinceId);
  }
  if (options.limit) {
    url.searchParams.set("limit", String(options.limit));
  }

  return authorizedRequest(url.toString(), token, "get notifications");
}
