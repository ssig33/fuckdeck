import { MastodonUser, MastodonStatus } from "../types";

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

export async function verifyCredentials(
  instance: string,
  token: string
): Promise<MastodonUser> {
  const response = await fetch(
    `https://${instance}/api/v1/accounts/verify_credentials`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to verify credentials: ${response.status}`);
  }

  return response.json();
}

export interface GetTimelineOptions {
  sinceId?: string;
  limit?: number;
}

export async function getHomeTimeline(
  instance: string,
  token: string,
  options: GetTimelineOptions = {}
): Promise<MastodonStatus[]> {
  const url = new URL(`https://${instance}/api/v1/timelines/home`);
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
    throw new Error(`Failed to get timeline: ${response.status}`);
  }

  return response.json();
}
