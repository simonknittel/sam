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

/** Sorted, so the same session always produces the same claim */
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
  /** `Citizen.id` */
  readonly subject: string;
  /** Null for an entity without a confirmed handle */
  readonly handle: string | null;
  readonly permissionStrings: readonly string[];
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
    // Omitted rather than null, so that consumers write an absence check
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
     * Nothing on our side depends on it (see "Replay protection" in
     * docs/embedded-app-authentication.md)
     */
    .setJti(createId())
    .setIssuedAt(issuedAtInSeconds)
    .setExpirationTime(expiresAtInSeconds)
    .sign(signingKey.privateKey);

  return { token, expiresAt: new Date(expiresAtInSeconds * 1000) };
};

export const appendEmbedToken = (
  embedUrl: string,
  token: string,
  queryParameter = DEFAULT_EMBED_TOKEN_QUERY_PARAMETER,
) => {
  const url = new URL(embedUrl);
  url.searchParams.set(queryParameter, token);

  return url.toString();
};
