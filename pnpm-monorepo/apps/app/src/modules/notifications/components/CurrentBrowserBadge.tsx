"use client";

import { useWebPushBrowser } from "./WebPushBrowserProvider";

interface Props {
  readonly subscriptionId: string;
}

/** Marks the subscription of the browser that shows the page */
export const CurrentBrowserBadge = ({ subscriptionId }: Props) => {
  const { currentSubscriptionId } = useWebPushBrowser();
  if (subscriptionId !== currentSubscriptionId) return null;

  return (
    <span className="rounded-secondary border border-me/30 bg-me/10 px-2 py-1 text-xs text-me">
      Dieser Browser
    </span>
  );
};
