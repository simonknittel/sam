import { UAParser } from "ua-parser-js";

/**
 * Condenses a raw user agent into something a person can recognize their own
 * device by, e.g. "Chrome 141 · Windows 10". Returns null when nothing could
 * be identified, so callers can fall back to the raw string instead of
 * showing an empty cell.
 */
export const formatUserAgent = (userAgent: string | null): string | null => {
  if (!userAgent) return null;

  const { browser, os, device } = UAParser(userAgent);

  const segments = [
    [browser.name, browser.major],
    [os.name, os.version],
    [device.vendor, device.model],
  ]
    .map((segment) => segment.filter(Boolean).join(" "))
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) return null;

  return segments.join(" · ");
};
