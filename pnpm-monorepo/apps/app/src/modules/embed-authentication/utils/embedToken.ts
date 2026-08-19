import { createId } from "@paralleldrive/cuid2";
import {
  transformPermissionSetToPermissionString,
  type PermissionSet,
} from "@sam-monorepo/permissions";
import { SignJWT } from "jose";
import {
  EMBED_TOKEN_ALGORITHM,
  EMBED_TOKEN_LIFETIME_IN_SECONDS,
  EMBED_TOKEN_QUERY_PARAMETER,
} from "./constants";
import type { EmbedSigningKey } from "./embedSigningKey";

/**
 * The permission strings an app declaring `resources` is allowed to see.
 * Deduplicated (roles overlap) and sorted, so the same session always
 * produces the same claim and otherwise identical tokens stay comparable.
 */
export const collectEmbedPermissionStrings = (
  givenPermissionSets: readonly PermissionSet[],
  resources: readonly PermissionSet["resource"][],
) =>
  [
    ...new Set(
      givenPermissionSets
        .filter((permissionSet) => resources.includes(permissionSet.resource))
        .map((permissionSet) =>
          transformPermissionSetToPermissionString(permissionSet),
        ),
    ),
  ].sort();

interface SignEmbedTokenParameters {
  readonly signingKey: EmbedSigningKey;
  readonly issuer: string;
  readonly audience: string;
  /** `Entity.id`, the only stable identifier the embedded app should key on. */
  readonly subject: string;
  /**
   * The Star Citizen handle, or null for an entity without a confirmed one.
   * Display text, not a key: it changes when someone renames themselves in
   * RSI.
   */
  readonly handle: string | null;
  readonly permissionStrings: readonly string[];
}

export const signEmbedToken = ({
  signingKey,
  issuer,
  audience,
  subject,
  handle,
  permissionStrings,
}: SignEmbedTokenParameters) =>
  new SignJWT({
    // OIDC's name for "the shorthand name the user wishes to be referred
    // to by" — omitted rather than null so consumers write an absence
    // check instead of rendering the string "null"
    ...(handle && { preferred_username: handle }),
    /**
     * Not `scope`: that belongs to OAuth 2.0 access tokens and denotes
     * delegated authority, while these are the subject's own authorization
     * attributes. An array also cannot be reparsed into a different
     * permission set by an attribute value that happens to contain a
     * space, which a space-delimited claim could be.
     */
    permissions: permissionStrings,
  })
    .setProtectedHeader({ alg: EMBED_TOKEN_ALGORITHM, kid: signingKey.keyId })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    /**
     * Nothing on our side depends on it. It exists so a verifier can
     * enforce at-most-once exchange by recording seen ids with a TTL
     * matching the token lifetime.
     */
    .setJti(createId())
    .setIssuedAt()
    .setExpirationTime(`${EMBED_TOKEN_LIFETIME_IN_SECONDS}s`)
    .sign(signingKey.privateKey);

/**
 * Returns the URL unchanged when there is no token, so an app that did not
 * opt in — or a render without a usable identity — embeds exactly the URL
 * it always did.
 */
export const appendEmbedToken = (embedUrl: string, token: string | null) => {
  if (!token) return embedUrl;

  const url = new URL(embedUrl);
  url.searchParams.set(EMBED_TOKEN_QUERY_PARAMETER, token);

  return url.toString();
};
