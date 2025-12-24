import { MastodonNotification } from "../types";

export interface GetNotificationsOptions {
  sinceId?: string;
  limit?: number;
}

export async function getNotifications(
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

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get notifications: ${response.status}`);
  }

  return response.json();
}
