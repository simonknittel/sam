/**
 * The push services of the large browsers, by the end of the host name of
 * their endpoints. Chrome and the other Chromium browsers (except Edge) use
 * Google, Firefox uses Mozilla, Safari uses Apple and Edge uses Microsoft.
 */
const WEB_PUSH_SERVICES = [
  { hostSuffix: "googleapis.com", name: "Google" },
  { hostSuffix: "push.services.mozilla.com", name: "Mozilla" },
  { hostSuffix: "push.apple.com", name: "Apple" },
  { hostSuffix: "notify.windows.com", name: "Microsoft" },
] as const;

/**
 * The push service is a hint at the browser for a subscription without a user
 * agent.
 */
export const formatWebPushService = (endpoint: string) => {
  let hostname;
  try {
    hostname = new URL(endpoint).hostname;
  } catch {
    return null;
  }

  const service = WEB_PUSH_SERVICES.find(
    ({ hostSuffix }) =>
      hostname === hostSuffix || hostname.endsWith(`.${hostSuffix}`),
  );

  return service?.name ?? hostname;
};
