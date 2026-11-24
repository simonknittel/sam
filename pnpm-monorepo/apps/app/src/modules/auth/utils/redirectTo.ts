/**
 * The proxy adds this search param to the login page URL when it redirects an
 * unauthenticated user away from a deep link. After the login, the user goes
 * back to the deep link.
 */
export const REDIRECT_TO_SEARCH_PARAM = "redirect-to";

/**
 * The proxy gives the path and the query of each `/app` request to the server
 * in this request header, because a layout cannot read the URL. The proxy
 * replaces a value that the client sends.
 */
export const REQUEST_PATH_HEADER = "x-sam-request-path";

/** Only to parse a relative path with `URL`: no request goes to this origin */
const DUMMY_ORIGIN = "http://redirect-to-validation.internal";

/**
 * Accepts only a relative path that stays on the same origin and points into
 * `/app`, to prevent an open redirect. `URL.parse()` normalizes traversal
 * segments (`..`) and backslashes, and the checks operate on the normalized
 * result. It is not yet Baseline "widely available", but only server code calls
 * this function.
 */
export const validateRedirectTo = (value: string | null): string | null => {
  if (!value?.startsWith("/")) return null;

  const url = URL.parse(value, DUMMY_ORIGIN);

  // A value such as `//evil.example.com` resolves to a different origin
  if (url?.origin !== DUMMY_ORIGIN) return null;

  if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) return null;

  return url.pathname + url.search;
};

/** Give only a value that `validateRedirectTo()` accepted */
export const getLoginPath = (redirectTo: string | null) => {
  const loginUrl = new URL("/", DUMMY_ORIGIN);
  if (redirectTo)
    loginUrl.searchParams.set(REDIRECT_TO_SEARCH_PARAM, redirectTo);

  return loginUrl.pathname + loginUrl.search;
};
