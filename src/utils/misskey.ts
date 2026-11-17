import {
  CustomEmoji,
  InstanceLimits,
  MastodonStatus,
  MastodonUser,
  MediaAttachment,
  PostStatusOptions,
  StreamEvent,
  Visibility,
} from "../types";
import { MastodonNotification, NotificationType } from "../types/notification";
import { StreamClient } from "./streaming";

// Misskey responses are converted to the Mastodon shapes the UI already uses.

const APP_NAME = "FuckDeck";
const PERMISSIONS = [
  "read:account",
  "read:notifications",
  "write:notes",
  "write:reactions",
  "write:drive",
];
// The reaction sent for "favourite".
const LIKE_REACTION = "❤";
const DEFAULT_MAX_FILES = 16;

export interface MisskeyEmojiMap {
  [name: string]: string;
}

export interface MisskeyUser {
  id: string;
  username: string;
  host: string | null;
  name: string | null;
  avatarUrl: string | null;
  emojis?: MisskeyEmojiMap;
}

export interface MisskeyFile {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  comment: string | null;
  isSensitive: boolean;
}

export interface MisskeyNote {
  id: string;
  createdAt: string;
  text: string | null;
  cw: string | null;
  user: MisskeyUser;
  visibility: "public" | "home" | "followers" | "specified";
  renote?: MisskeyNote | null;
  renoteId: string | null;
  files?: MisskeyFile[];
  uri?: string | null;
  url?: string | null;
  emojis?: MisskeyEmojiMap;
  reactions?: Record<string, number>;
  renoteCount?: number;
  repliesCount?: number;
  myReaction?: string | null;
}

export interface MisskeyNotification {
  id: string;
  createdAt: string;
  type: string;
  user?: MisskeyUser | null;
  note?: MisskeyNote | null;
  reaction?: string | null;
}

function getRedirectUri(): string {
  return window.location.origin + window.location.pathname.replace(/\/$/, "");
}

export function getMiAuthUrl(instance: string, session: string): string {
  const url = new URL(`https://${instance}/miauth/${session}`);
  url.searchParams.set("name", APP_NAME);
  url.searchParams.set("callback", getRedirectUri());
  url.searchParams.set("permission", PERMISSIONS.join(","));
  return url.toString();
}

export async function checkMiAuth(
  instance: string,
  session: string
): Promise<{ token: string; user: MastodonUser }> {
  const response = await fetch(`https://${instance}/api/miauth/${session}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(`Failed to check MiAuth: ${response.status}`);
  }
  const data = await response.json();
  if (!data.ok || !data.token) {
    throw new Error("MiAuth was not approved");
  }
  return { token: data.token, user: toMastodonUser(data.user, instance) };
}

/** Calls a Misskey API endpoint; the token goes in the body as `i`. */
export async function misskeyRequest<T>(
  instance: string,
  token: string | null,
  endpoint: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(`https://${instance}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(token ? { ...params, i: token } : params),
  });

  if (!response.ok) {
    throw new Error(`Failed to call ${endpoint}: ${response.status}`);
  }

  // Some endpoints answer 204 with no body.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Misskey ids sort by time within a server as long as they have the same length. */
export function compareIds(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

function emojisIn(
  texts: (string | null | undefined)[],
  known: MisskeyEmojiMap | undefined,
  instance: string
): CustomEmoji[] {
  const names = new Set<string>();
  for (const text of texts) {
    for (const match of (text ?? "").matchAll(/:([a-zA-Z0-9_+-]+):/g)) {
      names.add(match[1]);
    }
  }
  return Array.from(names).map((name) => {
    // Emojis of the user's own server are not listed; the server serves them by name.
    const url = known?.[name] ?? `https://${instance}/emoji/${name}.webp`;
    return { shortcode: name, url, static_url: url, visible_in_picker: false };
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the plain parts of MFM: line breaks, links and mentions. Other MFM
 * syntax is left as text.
 */
export function mfmToHtml(text: string, instance: string): string {
  const pattern =
    /(https?:\/\/[^\s<>"'()]+)|@([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9.-]+[a-zA-Z0-9]))?/g;
  let html = "";
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    // "foo@bar" in the middle of a word is not a mention.
    if (match[2] && index > 0 && /[a-zA-Z0-9_]/.test(text[index - 1])) {
      continue;
    }
    html += escapeHtml(text.slice(last, index));
    if (match[1]) {
      const url = escapeHtml(match[1]);
      html += `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    } else {
      const acct = match[3] ? `${match[2]}@${match[3]}` : match[2];
      html += `<a href="https://${instance}/@${escapeHtml(acct)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(acct)}</a>`;
    }
    last = index + match[0].length;
  }
  html += escapeHtml(text.slice(last));
  return `<p>${html.replace(/\n/g, "<br>")}</p>`;
}

export function toMastodonUser(user: MisskeyUser, instance: string): MastodonUser {
  const acct = user.host ? `${user.username}@${user.host}` : user.username;
  const avatar = user.avatarUrl ?? "";
  return {
    id: user.id,
    username: user.username,
    acct,
    display_name: user.name ?? "",
    avatar,
    avatar_static: avatar,
    url: `https://${instance}/@${acct}`,
    emojis: emojisIn([user.name], user.emojis, instance),
  };
}

function toMediaAttachment(file: MisskeyFile): MediaAttachment {
  const kind = file.type.split("/")[0];
  return {
    id: file.id,
    type:
      kind === "image" ? "image" : kind === "video" ? "video" : kind === "audio" ? "audio" : "unknown",
    url: file.url,
    preview_url: file.thumbnailUrl ?? file.url,
    description: file.comment,
  };
}

const TO_VISIBILITY: Record<MisskeyNote["visibility"], Visibility> = {
  public: "public",
  home: "unlisted",
  followers: "private",
  specified: "direct",
};

const FROM_VISIBILITY: Record<Visibility, MisskeyNote["visibility"]> = {
  public: "public",
  unlisted: "home",
  private: "followers",
  direct: "specified",
};

function isPureRenote(note: MisskeyNote): boolean {
  return !!note.renote && !note.text && !note.cw && (note.files?.length ?? 0) === 0;
}

export function toMastodonStatus(note: MisskeyNote, instance: string): MastodonStatus {
  const uri = note.uri ?? `https://${instance}/notes/${note.id}`;
  const reblog = isPureRenote(note) ? toMastodonStatus(note.renote!, instance) : null;
  let content = note.text ? mfmToHtml(note.text, instance) : "";
  if (note.renote && !reblog) {
    const quoted = note.renote;
    const quotedText = quoted.text ? mfmToHtml(quoted.text, instance) : "";
    content += `<blockquote><p>RN @${escapeHtml(
      quoted.user.host ? `${quoted.user.username}@${quoted.user.host}` : quoted.user.username
    )}</p>${quotedText}</blockquote>`;
  }
  const files = note.files ?? [];

  return {
    id: note.id,
    created_at: note.createdAt,
    content,
    account: toMastodonUser(note.user, instance),
    reblog,
    media_attachments: files.map(toMediaAttachment),
    favourites_count: Object.values(note.reactions ?? {}).reduce((a, b) => a + b, 0),
    reblogs_count: note.renoteCount ?? 0,
    replies_count: note.repliesCount ?? 0,
    uri,
    url: note.url ?? `https://${instance}/notes/${note.id}`,
    spoiler_text: note.cw ?? "",
    sensitive: files.some((f) => f.isSensitive),
    favourited: !!note.myReaction,
    // Misskey does not tell whether the viewer has renoted.
    reblogged: false,
    visibility: TO_VISIBILITY[note.visibility] ?? "public",
    emojis: emojisIn([note.text, note.cw, note.renote?.text], note.emojis, instance),
  };
}

const NOTIFICATION_TYPES: Record<string, NotificationType> = {
  mention: "mention",
  reply: "mention",
  quote: "mention",
  note: "status",
  renote: "reblog",
  reaction: "favourite",
  follow: "follow",
  receiveFollowRequest: "follow_request",
  pollEnded: "poll",
};

/** Returns null for notification types the UI has no counterpart for. */
export function toMastodonNotification(
  notification: MisskeyNotification,
  instance: string
): MastodonNotification | null {
  const type = NOTIFICATION_TYPES[notification.type];
  if (!type || !notification.user) return null;
  return {
    id: notification.id,
    type,
    created_at: notification.createdAt,
    account: toMastodonUser(notification.user, instance),
    status: notification.note ? toMastodonStatus(notification.note, instance) : undefined,
  };
}

export async function verifyCredentials(
  instance: string,
  token: string
): Promise<MastodonUser> {
  const user = await misskeyRequest<MisskeyUser>(instance, token, "i");
  return toMastodonUser(user, instance);
}

export interface PageOptions {
  sinceId?: string;
  maxId?: string;
  limit?: number;
}

// With sinceId Misskey returns the oldest entries after it, unlike Mastodon's
// newest. Fetching the latest page and cutting at sinceId keeps Mastodon's
// meaning: a full page means there may be a gap below it.
function pageParams(options: PageOptions): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (options.limit) params.limit = options.limit;
  if (options.maxId) params.untilId = options.maxId;
  return params;
}

function newerThan<T extends { id: string }>(items: T[], sinceId?: string): T[] {
  const sorted = [...items].sort((a, b) => compareIds(b.id, a.id));
  return sinceId ? sorted.filter((item) => compareIds(item.id, sinceId) > 0) : sorted;
}

async function getTimeline(
  endpoint: string,
  instance: string,
  token: string,
  options: PageOptions
): Promise<MastodonStatus[]> {
  const notes = await misskeyRequest<MisskeyNote[]>(
    instance,
    token,
    endpoint,
    pageParams(options)
  );
  return newerThan(notes, options.sinceId).map((n) => toMastodonStatus(n, instance));
}

export function getHomeTimeline(
  instance: string,
  token: string,
  options: PageOptions = {}
): Promise<MastodonStatus[]> {
  return getTimeline("notes/timeline", instance, token, options);
}

export function getLocalTimeline(
  instance: string,
  token: string,
  options: PageOptions = {}
): Promise<MastodonStatus[]> {
  return getTimeline("notes/local-timeline", instance, token, options);
}

export async function getNotifications(
  instance: string,
  token: string,
  options: PageOptions = {}
): Promise<MastodonNotification[]> {
  const notifications = await misskeyRequest<MisskeyNotification[]>(
    instance,
    token,
    "i/notifications",
    pageParams(options)
  );
  return newerThan(notifications, options.sinceId)
    .map((n) => toMastodonNotification(n, instance))
    .filter((n): n is MastodonNotification => n !== null);
}

export async function postStatus(
  instance: string,
  token: string,
  options: PostStatusOptions
): Promise<MastodonStatus> {
  const params: Record<string, unknown> = {
    text: options.status,
    visibility: FROM_VISIBILITY[options.visibility ?? "public"],
  };
  if (options.spoiler_text) params.cw = options.spoiler_text;
  if (options.media_ids?.length) params.fileIds = options.media_ids;
  if (options.in_reply_to_id) params.replyId = options.in_reply_to_id;

  const result = await misskeyRequest<{ createdNote: MisskeyNote }>(
    instance,
    token,
    "notes/create",
    params
  );
  return toMastodonStatus(result.createdNote, instance);
}

export async function uploadMedia(
  instance: string,
  token: string,
  file: File
): Promise<MediaAttachment> {
  const form = new FormData();
  form.append("i", token);
  form.append("file", file);

  const response = await fetch(`https://${instance}/api/drive/files/create`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload media: ${response.status}`);
  }
  return toMediaAttachment(await response.json());
}

export async function favouriteStatus(instance: string, token: string, noteId: string) {
  await misskeyRequest(instance, token, "notes/reactions/create", {
    noteId,
    reaction: LIKE_REACTION,
  });
}

export async function unfavouriteStatus(instance: string, token: string, noteId: string) {
  await misskeyRequest(instance, token, "notes/reactions/delete", { noteId });
}

export async function reblogStatus(instance: string, token: string, noteId: string) {
  await misskeyRequest(instance, token, "notes/create", { renoteId: noteId });
}

export async function unreblogStatus(instance: string, token: string, noteId: string) {
  await misskeyRequest(instance, token, "notes/unrenote", { noteId });
}

/** Returns this server's note id for the post at `uri`, fetching it if needed. */
export async function findNoteId(
  instance: string,
  token: string,
  uri: string
): Promise<string> {
  const result = await misskeyRequest<{ type: string; object: { id: string } }>(
    instance,
    token,
    "ap/show",
    { uri }
  );
  if (result?.type !== "Note") {
    throw new Error(`Failed to find status on ${instance}`);
  }
  return result.object.id;
}

export async function getInstanceLimits(instance: string): Promise<InstanceLimits> {
  try {
    const meta = await misskeyRequest<{ maxNoteTextLength?: number }>(
      instance,
      null,
      "meta",
      { detail: false }
    );
    return {
      maxCharacters: meta?.maxNoteTextLength ?? 3000,
      maxMediaAttachments: DEFAULT_MAX_FILES,
    };
  } catch (error) {
    console.warn(`Failed to get instance limits for ${instance}:`, error);
    return { maxCharacters: 3000, maxMediaAttachments: DEFAULT_MAX_FILES };
  }
}

const HOME_CHANNEL = "home";
const MAIN_CHANNEL = "main";
const LOCAL_CHANNEL = "local";

export class MisskeyStreamClient extends StreamClient {
  protected async getUrl(): Promise<string> {
    return `wss://${this.instance}/streaming?i=${this.token}`;
  }

  protected subscribe(ws: WebSocket): void {
    ws.send(
      JSON.stringify({ type: "connect", body: { channel: "homeTimeline", id: HOME_CHANNEL } })
    );
    ws.send(JSON.stringify({ type: "connect", body: { channel: "main", id: MAIN_CHANNEL } }));
  }

  protected subscribeLocal(ws: WebSocket, enabled: boolean): void {
    ws.send(
      JSON.stringify(
        enabled
          ? { type: "connect", body: { channel: "localTimeline", id: LOCAL_CHANNEL } }
          : { type: "disconnect", body: { id: LOCAL_CHANNEL } }
      )
    );
  }

  protected toStreamEvents(message: any): StreamEvent[] {
    if (message?.type !== "channel") return [];
    const { id, type, body } = message.body ?? {};

    if (id === HOME_CHANNEL && type === "note") {
      return [
        {
          event: "update",
          payload: JSON.stringify(toMastodonStatus(body, this.instance)),
        },
      ];
    }
    if (id === LOCAL_CHANNEL && type === "note") {
      return [
        {
          event: "update",
          payload: JSON.stringify(toMastodonStatus(body, this.instance)),
          timeline: "local",
        },
      ];
    }
    if (id === MAIN_CHANNEL && type === "notification") {
      const notification = toMastodonNotification(body, this.instance);
      return notification
        ? [{ event: "notification", payload: JSON.stringify(notification) }]
        : [];
    }
    return [];
  }
}
