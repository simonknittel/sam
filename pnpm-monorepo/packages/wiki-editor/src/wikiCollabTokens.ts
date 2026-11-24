/**
 * Payloads of the JWTs authenticating requests to the collab server
 * (apps/collab). The Next.js app mints them (short-lived, HS256, signed
 * with the shared COLLAB_JWT_SECRET); the collab server only verifies.
 * Both sides use these definitions, and the explicit `scope` claim keeps
 * the token kinds from ever being interchangeable.
 */

export interface WikiCollabSessionTokenPayload {
  readonly scope: "session";
  /** User id (JWT subject) — attributed as the audit event author */
  readonly sub: string;
  readonly pageId: string;
  readonly entityId: string | null;
  readonly canEdit: boolean;
}

export interface WikiCollabReplaceTokenPayload {
  readonly scope: "replace";
  readonly pageId: string;
  readonly entityId: string | null;
}

export interface WikiCollabDisconnectTokenPayload {
  readonly scope: "disconnect";
  /** The user (JWT subject) whose connections the collab server closes */
  readonly sub: string;
}

/**
 * NULL for anything that is not a session token (the payload crosses a trust
 * boundary on the server).
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
 * NULL for anything that is not a replace token — including session tokens,
 * which must never authorize a replace.
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

/**
 * NULL for anything that is not a disconnect token — including session tokens,
 * which have a user too.
 */
export const parseWikiCollabDisconnectTokenPayload = (
  payload: unknown,
): WikiCollabDisconnectTokenPayload | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const claims = payload as Record<string, unknown>;

  if (claims.scope !== "disconnect") return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;

  return { scope: "disconnect", sub: claims.sub };
};
