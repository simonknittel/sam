import { createId } from "@paralleldrive/cuid2";
import {
  transformPermissionSetToPermissionString,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { SignJWT } from "jose";
import {
  DEFAULT_EMBED_TOKEN_LIFETIME_IN_SECONDS,
  DEFAULT_EMBED_TOKEN_QUERY_PARAMETER,
  EMBED_TOKEN_ALGORITHM,
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
  /** `Citizen.id`, the only stable identifier the embedded app should key on. */
  readonly subject: string;
  /**
   * The Star Citizen handle, or null for an entity without a confirmed one.
   * Display text, not a key: it changes when someone renames themselves in
   * RSI.
   */
  readonly handle: string | null;
  readonly permissionStrings: readonly string[];
  /** Default: `DEFAULT_EMBED_TOKEN_LIFETIME_IN_SECONDS` */
  readonly lifetimeInSeconds?: number;
}

export interface SignedEmbedToken {
  readonly token: string;
  /** The `exp` claim of the token */
  readonly expiresAt: Date;
}

export const signEmbedToken = async ({
  signingKey,
  issuer,
  audience,
  subject,
  handle,
  permissionStrings,
  lifetimeInSeconds = DEFAULT_EMBED_TOKEN_LIFETIME_IN_SECONDS,
}: SignEmbedTokenParameters): Promise<SignedEmbedToken> => {
  // One reading of the clock for both claims, thus `exp` is always `iat`
  // plus the lifetime
  const issuedAtInSeconds = Math.floor(Date.now() / 1000);
  const expiresAtInSeconds = issuedAtInSeconds + lifetimeInSeconds;

  const token = await new SignJWT({
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
    .setIssuedAt(issuedAtInSeconds)
    .setExpirationTime(expiresAtInSeconds)
    .sign(signingKey.privateKey);

  return { token, expiresAt: new Date(expiresAtInSeconds * 1000) };
};

/**
 * Returns the URL unchanged when there is no token, so an app that did not
 * opt in — or a render without a usable identity — embeds exactly the URL
 * it always did.
 */
export const appendEmbedToken = (
  embedUrl: string,
  token: string | null,
  queryParameter = DEFAULT_EMBED_TOKEN_QUERY_PARAMETER,
) => {
  if (!token) return embedUrl;

  const url = new URL(embedUrl);
  url.searchParams.set(queryParameter, token);

  return url.toString();
};
