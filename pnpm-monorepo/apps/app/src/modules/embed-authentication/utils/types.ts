import type { PermissionSet } from "@sam-monorepo/permissions";

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
  audience: string;
  /**
   * Only permission strings for these resources enter the token. Keeps the
   * URL short, follows least privilege, and stops the embedded app from
   * learning our full permission model.
   */
  permissionResources: PermissionSet["resource"][];
}
