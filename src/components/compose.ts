import type { KeyboardEvent } from "react";
import { Account } from "../types";

export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Followers only" },
  { value: "direct", label: "Direct" },
];

export function toAccountOptions(accounts: Account[]) {
  return accounts.map((account) => ({
    value: account.id,
    label: `@${account.user?.username ?? "..."}@${account.instance}`,
  }));
}

/** Ctrl/Cmd+Enter submits the form. */
export function isSubmitShortcut(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && e.key === "Enter";
}
