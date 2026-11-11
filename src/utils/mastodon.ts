import {
  MastodonUser,
  MastodonStatus,
  MediaAttachment,
  PostStatusOptions,
  InstanceLimits,
} from "../types";

const APP_NAME = "FuckDeck";
const APP_SCOPES = "read write";

function getRedirectUri(): string {
  return window.location.origin + window.location.pathname.replace(/\/$/, "");
}

export interface AppCredentials {
  clientId: string;
  clientSecret: string;
}

export async function registerApp(instance: string): Promise<AppCredentials> {
  const response = await fetch(`https://${instance}/api/v1/apps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_name: APP_NAME,
      redirect_uris: getRedirectUri(),
      scopes: APP_SCOPES,
      website: window.location.origin,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to register app: ${response.status}`);
  }

  const data = await response.json();
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
}

export function getAuthorizationUrl(
  instance: string,
  clientId: string
): string {
  const url = new URL(`https://${instance}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", APP_SCOPES);
  return url.toString();
}

export async function exchangeToken(
  instance: string,
  clientId: string,
  clientSecret: string,
  code: string
): Promise<string> {
  const response = await fetch(`https://${instance}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
      code: code,
      scope: APP_SCOPES,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Sends an authorized request and returns the parsed JSON body.
 * Throws `Failed to <action>: <status>` when the response is not ok.
 */
export async function authorizedRequest<T>(
  url: string,
  token: string,
  action: string,
  init: { method?: string; body?: BodyInit; json?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const response = await fetch(url, { method: init.method, headers, body });

  if (!response.ok) {
    throw new Error(`Failed to ${action}: ${response.status}`);
  }

  return response.json();
}

export function verifyCredentials(
  instance: string,
  token: string
): Promise<MastodonUser> {
  return authorizedRequest(
    `https://${instance}/api/v1/accounts/verify_credentials`,
    token,
    "verify credentials"
  );
}

export interface GetTimelineOptions {
  sinceId?: string;
  maxId?: string;
  limit?: number;
}

export function getHomeTimeline(
  instance: string,
  token: string,
  options: GetTimelineOptions = {}
): Promise<MastodonStatus[]> {
  const url = new URL(`https://${instance}/api/v1/timelines/home`);
  if (options.sinceId) {
    url.searchParams.set("since_id", options.sinceId);
  }
  if (options.maxId) {
    url.searchParams.set("max_id", options.maxId);
  }
  if (options.limit) {
    url.searchParams.set("limit", String(options.limit));
  }

  return authorizedRequest(url.toString(), token, "get timeline");
}

export function uploadMedia(
  instance: string,
  token: string,
  file: File,
  description?: string
): Promise<MediaAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  if (description) {
    formData.append("description", description);
  }

  return authorizedRequest(
    `https://${instance}/api/v2/media`,
    token,
    "upload media",
    { method: "POST", body: formData }
  );
}

export function postStatus(
  instance: string,
  token: string,
  options: PostStatusOptions
): Promise<MastodonStatus> {
  return authorizedRequest(
    `https://${instance}/api/v1/statuses`,
    token,
    "post status",
    { method: "POST", json: options }
  );
}

type StatusAction = "favourite" | "unfavourite" | "reblog" | "unreblog";

function statusAction(
  instance: string,
  token: string,
  statusId: string,
  action: StatusAction
): Promise<MastodonStatus> {
  return authorizedRequest(
    `https://${instance}/api/v1/statuses/${statusId}/${action}`,
    token,
    `${action} status`,
    { method: "POST" }
  );
}

export function favouriteStatus(
  instance: string,
  token: string,
  statusId: string
): Promise<MastodonStatus> {
  return statusAction(instance, token, statusId, "favourite");
}

export function unfavouriteStatus(
  instance: string,
  token: string,
  statusId: string
): Promise<MastodonStatus> {
  return statusAction(instance, token, statusId, "unfavourite");
}

export function reblogStatus(
  instance: string,
  token: string,
  statusId: string
): Promise<MastodonStatus> {
  return statusAction(instance, token, statusId, "reblog");
}

export function unreblogStatus(
  instance: string,
  token: string,
  statusId: string
): Promise<MastodonStatus> {
  return statusAction(instance, token, statusId, "unreblog");
}

export async function getInstanceInfo(
  instance: string
): Promise<{ streamingUrl?: string }> {
  try {
    const response = await fetch(`https://${instance}/api/v2/instance`);

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return {
      streamingUrl: data?.configuration?.urls?.streaming,
    };
  } catch (error) {
    console.warn(`Failed to get instance info for ${instance}:`, error);
    return {};
  }
}

export const DEFAULT_INSTANCE_LIMITS: InstanceLimits = {
  maxCharacters: 500,
  maxMediaAttachments: 4,
};

function parseInstanceLimits(data: any): Partial<InstanceLimits> {
  const statuses = data?.configuration?.statuses;
  const maxCharacters = statuses?.max_characters ?? data?.max_toot_chars;
  const maxMediaAttachments =
    statuses?.max_media_attachments ?? data?.max_media_attachments;

  return {
    maxCharacters:
      typeof maxCharacters === "number" ? maxCharacters : undefined,
    maxMediaAttachments:
      typeof maxMediaAttachments === "number" ? maxMediaAttachments : undefined,
  };
}

async function fetchInstanceLimits(url: string): Promise<Partial<InstanceLimits>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {};
    }
    return parseInstanceLimits(await response.json());
  } catch (error) {
    console.warn(`Failed to get instance limits from ${url}:`, error);
    return {};
  }
}

export async function getInstanceLimits(
  instance: string
): Promise<InstanceLimits> {
  const v2 = await fetchInstanceLimits(`https://${instance}/api/v2/instance`);

  if (
    v2.maxCharacters !== undefined &&
    v2.maxMediaAttachments !== undefined
  ) {
    return v2 as InstanceLimits;
  }

  const v1 = await fetchInstanceLimits(`https://${instance}/api/v1/instance`);

  return {
    maxCharacters:
      v2.maxCharacters ?? v1.maxCharacters ?? DEFAULT_INSTANCE_LIMITS.maxCharacters,
    maxMediaAttachments:
      v2.maxMediaAttachments ??
      v1.maxMediaAttachments ??
      DEFAULT_INSTANCE_LIMITS.maxMediaAttachments,
  };
}
