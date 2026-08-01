/**
 * Payloads of the JWTs authenticating requests to the collab server
 * (apps/collab). The Next.js app mints them (short-lived, HS256, signed
 * with the shared COLLAB_JWT_SECRET); the collab server only verifies.
 * Both sides use these definitions, and the explicit `scope` claim keeps
 * the two token kinds from ever being interchangeable.
 */

/** Authorizes one editor connection to one page */
export interface WikiCollabSessionTokenPayload {
  readonly scope: "session";
  /** User id (JWT subject) — attributed as the audit event author */
  readonly sub: string;
  readonly pageId: string;
  readonly entityId: string | null;
  readonly canEdit: boolean;
}

/** Authorizes one internal replace request for one page */
export interface WikiCollabReplaceTokenPayload {
  readonly scope: "replace";
  readonly pageId: string;
  readonly entityId: string | null;
}

/**
 * Parses a verified JWT's payload into a session token; NULL for anything
 * that is not one (the payload crosses a trust boundary on the server).
 */
export const parseWikiCollabSessionTokenPayload = (
  payload: unknown,
): WikiCollabSessionTokenPayload | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const claims = payload as Record<string, unknown>;

  if (claims.scope !== "session") return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (typeof claims.pageId !== "string" || !claims.pageId) return null;
  if (typeof claims.entityId !== "string" && claims.entityId !== null)
    return null;
  if (typeof claims.canEdit !== "boolean") return null;

  return {
    scope: "session",
    sub: claims.sub,
    pageId: claims.pageId,
    entityId: claims.entityId,
    canEdit: claims.canEdit,
  };
};

/**
 * Parses a verified JWT's payload into a replace token; NULL for anything
 * that is not one — including session tokens, which must never authorize
 * a replace.
 */
export const parseWikiCollabReplaceTokenPayload = (
  payload: unknown,
): WikiCollabReplaceTokenPayload | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const claims = payload as Record<string, unknown>;

  if (claims.scope !== "replace") return null;
  if (typeof claims.pageId !== "string" || !claims.pageId) return null;
  if (typeof claims.entityId !== "string" && claims.entityId !== null)
    return null;

  return {
    scope: "replace",
    pageId: claims.pageId,
    entityId: claims.entityId,
  };
};
