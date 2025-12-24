import { MastodonUser, MastodonStatus, Account } from "./index";

export type NotificationType =
  | "mention"
  | "status"
  | "reblog"
  | "follow"
  | "follow_request"
  | "favourite"
  | "poll"
  | "update";

export interface MastodonNotification {
  id: string;
  type: NotificationType;
  created_at: string;
  account: MastodonUser;
  status?: MastodonStatus;
}

export interface UnifiedNotification {
  notification: MastodonNotification;
  targetAccount: Account;
}
