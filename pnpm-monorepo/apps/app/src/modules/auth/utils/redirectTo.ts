/**
 * The proxy adds this search param to the login page URL when it redirects an
 * unauthenticated user away from a deep link. After the login, the user goes
 * back to the deep link.
 */
export const REDIRECT_TO_SEARCH_PARAM = "redirect-to";

/**
 * This dummy origin makes it possible to parse a relative path with
 * `new URL()`. No request goes to this origin.
 */
const DUMMY_ORIGIN = "http://redirect-to-validation.internal";

/**
 * Validates the value of the `redirect-to` search param.
 *
 * To prevent an open redirect, the function only accepts a relative path that
 * stays on the same origin and points into `/app`. `new URL()` normalizes
 * traversal segments (`..`) and backslashes, and the checks operate on the
 * normalized result.
 *
 * @returns The normalized path together with its search params, or `null` if
 * the value is not a safe target.
 */
export const validateRedirectTo = (value: string | null): string | null => {
  if (!value?.startsWith("/")) return null;

  let url: URL;
  try {
    url = new URL(value, DUMMY_ORIGIN);
  } catch {
    return null;
  }

  // A value such as `//evil.example.com` resolves to a different origin
  if (url.origin !== DUMMY_ORIGIN) return null;

  if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) return null;

  return url.pathname + url.search;
};
