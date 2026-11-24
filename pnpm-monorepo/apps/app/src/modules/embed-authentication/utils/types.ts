import type { PermissionSet } from "@sam-monorepo/domain";

/**
 * Only for apps we control (see "Why the opt-in" in
 * docs/embedded-app-authentication.md)
 */
export interface EmbedAuthentication {
  /**
   * The `aud` claim. Deliberately not derived from the iframe URL's origin:
   * that would silently change when someone edits the URL and break
   * verification with no local signal.
   */
  readonly audience: string;
  /** Only permission strings for these resources enter the token */
  readonly permissionResources: readonly PermissionSet["resource"][];
  /**
   * Set it only for an app that reads the token from a parameter with a fixed
   * name
   */
  readonly queryParameter?: string;
  /**
   * Set a longer lifetime only for an app that examines the token on each
   * request. Its page must sign a new token before the expiry.
   */
  readonly lifetimeInSeconds?: number;
}
