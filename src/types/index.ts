export interface MastodonUser {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  avatar_static: string;
  url: string;
}

export interface MediaAttachment {
  id: string;
  type: "image" | "video" | "gifv" | "audio" | "unknown";
  url: string;
  preview_url: string;
  description: string | null;
}

export interface UploadedMedia {
  file: File;
  previewUrl: string;
  attachment?: MediaAttachment;
  uploading: boolean;
  error?: string;
}

export interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  account: MastodonUser;
  reblog: MastodonStatus | null;
  media_attachments: MediaAttachment[];
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  url: string;
  spoiler_text: string;
  sensitive: boolean;
  favourited: boolean;
  reblogged: boolean;
  visibility: Visibility;
}

export interface Account {
  id: string;
  instance: string;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  user: MastodonUser | null;
}

export interface PendingAuth {
  instance: string;
  clientId: string;
  clientSecret: string;
}

export interface StoredData {
  accounts: Account[];
  pendingAuth: PendingAuth | null;
}

export type Visibility = "public" | "unlisted" | "private" | "direct";

export interface PostStatusOptions {
  status: string;
  visibility?: Visibility;
  spoiler_text?: string;
  sensitive?: boolean;
  media_ids?: string[];
  in_reply_to_id?: string;
}

export type StreamEvent = {
  event: 'update' | 'notification' | 'delete' | 'filters_changed';
  payload: string;
};

export type ConnectionStatus = 'streaming' | 'polling' | 'connecting' | 'error';

export * from "./notification";
