import { Account, MastodonStatus, UnifiedStatus } from "../types";

export interface UnifiedTimelineSource {
  account: Account;
  statuses: MastodonStatus[];
  deletedIds?: Set<string>;
  hasMore: boolean;
}

function time(status: MastodonStatus): number {
  return new Date(status.created_at).getTime();
}

function liveStatuses(source: UnifiedTimelineSource): MastodonStatus[] {
  return source.statuses.filter((s) => !source.deletedIds?.has(s.id));
}

// The account whose loaded history ends most recently. Below its oldest status
// the other accounts are complete but it is not, so nothing older is shown.
export function findLimitingSource(
  sources: UnifiedTimelineSource[]
): { accountId: string; oldest: MastodonStatus } | null {
  let result: { accountId: string; oldest: MastodonStatus } | null = null;

  for (const source of sources) {
    if (!source.hasMore) continue;
    const statuses = liveStatuses(source);
    if (statuses.length === 0) continue;
    const oldest = statuses.reduce((a, b) => (time(b) < time(a) ? b : a));
    if (!result || time(oldest) > time(result.oldest)) {
      result = { accountId: source.account.id, oldest };
    }
  }

  return result;
}

export function mergeUnifiedTimeline(
  sources: UnifiedTimelineSource[]
): UnifiedStatus[] {
  const limiting = findLimitingSource(sources);
  const cutoff = limiting ? time(limiting.oldest) : -Infinity;
  // The same post reaches every account that follows its author, each with
  // its own id, but its uri is the same everywhere.
  const byUri = new Map<string, UnifiedStatus>();

  for (const source of sources) {
    for (const status of liveStatuses(source)) {
      if (time(status) < cutoff || byUri.has(status.uri)) continue;
      byUri.set(status.uri, { status, sourceAccount: source.account });
    }
  }

  return Array.from(byUri.values()).sort(
    (a, b) => time(b.status) - time(a.status)
  );
}
