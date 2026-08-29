import { useEffect } from "react";
import { Account, InstanceLimits } from "../types";
import { DEFAULT_INSTANCE_LIMITS, getInstanceLimits } from "../utils/mastodon";
import { useAccounts } from "./useAccounts";

/**
 * Returns the posting limits of the given account's instance.
 *
 * The limits are cached on the account itself, so they are fetched only once
 * per account. Until they are available, sensible defaults are returned.
 */
export function useInstanceLimits(
  account: Account | undefined
): InstanceLimits {
  const { updateAccount } = useAccounts();

  useEffect(() => {
    if (!account || account.limits) return;

    let cancelled = false;
    getInstanceLimits(account.instance).then((limits) => {
      if (!cancelled) {
        updateAccount({ ...account, limits });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [account?.id, account?.instance, account?.limits]);

  return account?.limits ?? DEFAULT_INSTANCE_LIMITS;
}
