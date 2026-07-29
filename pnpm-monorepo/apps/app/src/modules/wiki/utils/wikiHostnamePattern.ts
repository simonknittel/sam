/**
 * Matches a bare lowercase hostname like "example.com" (no scheme, port or
 * path). Shared by the iframe allowlist action's server-side validation and
 * the settings form's client-side check. Lives in utils/ (and not next to
 * `MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES` in queries/getWikiSettings.ts) so
 * client components can import it without pulling in server-only code.
 */
export const WIKI_HOSTNAME_PATTERN =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
