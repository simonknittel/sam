import type { PermissionSet } from "@sam-monorepo/domain";

/**
 * Opts one external app into authenticated embedding: its iframe URL
 * receives a short-lived JWT identifying the signed-in user (see
 * docs/embedded-app-authentication.md). Only for apps we control — the
 * token ends up in the target's access logs, in the browser history and in
 * the `Referer` header of the target's outbound links, so this is an
 * explicit opt-in rather than something derived from having an iframe URL.
 */
export interface EmbedAuthentication {
  /**
   * The `aud` claim. Without it, whoever controls one embed target could
   * replay a user's token against another. Deliberately not derived from
   * the iframe URL's origin: that would silently change when someone edits
   * the URL and break verification with no local signal.
   */
  readonly audience: string;
  /**
   * Only permission strings for these resources enter the token. Keeps the
   * URL short, follows least privilege, and stops the embedded app from
   * learning our full permission model.
   */
  readonly permissionResources: readonly PermissionSet["resource"][];
  /**
   * The query parameter of the token. Default:
   * `DEFAULT_EMBED_TOKEN_QUERY_PARAMETER`. Set it only for an app that reads
   * the token from a parameter with a fixed name.
   */
  readonly queryParameter?: string;
  /**
   * The lifetime of the token. Default:
   * `DEFAULT_EMBED_TOKEN_LIFETIME_IN_SECONDS`. Set a longer lifetime only for
   * an app that makes no session of its own and examines the token on each
   * request: such an app stops at the expiry of the token, thus its page
   * must sign a new token before that time. A longer lifetime also keeps a
   * token in the logs and in the browser history valid for a longer time.
   */
  readonly lifetimeInSeconds?: number;
}
