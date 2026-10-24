import type {
  ApplicationContext,
  WikiCollabSession,
  WikiPageContentReplacement,
} from "@sam-monorepo/application";
import type {
  WikiCollabDisconnectTokenPayload,
  WikiCollabReplaceTokenPayload,
  WikiCollabSessionTokenPayload,
} from "@sam-monorepo/wiki-editor";
import { SignJWT, type JWTPayload } from "jose";

/**
 * The lifetime of a session token. The editor sends a new session token
 * after half of this time (see `WikiCollabEditor` of the app), and the
 * collab server closes a connection without a valid session token. Thus a
 * user who loses the access keeps an open editor for at most this time plus
 * the grace period of the collab server.
 */
const SESSION_TOKEN_LIFETIME = "120s";

/** The lifetime of a replace token and of a disconnect token: used at once */
const REQUEST_TOKEN_LIFETIME = "60s";

const TOKEN_ALGORITHM = "HS256";

/**
 * The maximum time of one disconnect request. A ban waits for it, and a
 * failure does not stop the ban.
 */
const DISCONNECT_TIMEOUT_MILLISECONDS = 5_000;

export interface CollabClientOptions {
  /** The WebSocket URL of the collab server (`ws:` or `wss:`) */
  readonly url: string;
  /** The HS256 secret that the host shares with the collab server */
  readonly jwtSecret: string;
  /** The maximum time of one replace request */
  readonly replaceTimeoutMilliseconds: number;
}

/**
 * The collab server of the wiki editor (`apps/collab`). The client signs the
 * tokens that the server verifies. The explicit `scope` claim keeps the
 * token kinds apart: for example, a session token never authorizes a
 * replace.
 */
export const createCollabClient = ({
  url,
  jwtSecret,
  replaceTimeoutMilliseconds,
}: CollabClientOptions): NonNullable<ApplicationContext["collab"]> => {
  const key = new TextEncoder().encode(jwtSecret);

  const signToken = (
    claims: JWTPayload,
    lifetime: string,
    subject?: string,
  ) => {
    const token = new SignJWT(claims)
      .setProtectedHeader({ alg: TOKEN_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(lifetime);
    if (subject !== undefined) token.setSubject(subject);

    return token.sign(key);
  };

  /**
   * Sends a request to an HTTP endpoint of the collab server, which has the
   * host of the WebSocket URL. Throws when the server does not accept the
   * request.
   */
  const post = async (
    path: string,
    token: string,
    timeoutMilliseconds: number,
    jsonBody?: string,
  ) => {
    const endpointUrl = new URL(path, url);
    endpointUrl.protocol = endpointUrl.protocol === "ws:" ? "http:" : "https:";

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        ...(jsonBody === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      body: jsonBody,
      signal: AbortSignal.timeout(timeoutMilliseconds),
    });
    /**
     * The client uses only the status. It cancels the body, thus the
     * connection does not wait for a read of the body.
     */
    await response.body?.cancel();
    if (!response.ok)
      throw new Error(
        `Collab request to ${path} failed with status ${response.status}`,
      );
  };

  return {
    /**
     * Always through the internal endpoint of the collab server, thus the
     * connected editors get the new content. A direct write to the database
     * would fork a live editing session.
     */
    replaceContent: async ({
      pageId,
      content,
      updatedByEntityId,
    }: WikiPageContentReplacement) => {
      const token = await signToken(
        {
          scope: "replace",
          pageId,
          entityId: updatedByEntityId,
        } satisfies WikiCollabReplaceTokenPayload,
        REQUEST_TOKEN_LIFETIME,
      );

      await post(
        "/replace",
        token,
        replaceTimeoutMilliseconds,
        JSON.stringify({ content }),
      );
    },

    createSessionToken: ({
      userId,
      pageId,
      entityId,
      canEdit,
    }: WikiCollabSession) =>
      signToken(
        {
          scope: "session",
          pageId,
          entityId,
          canEdit,
        } satisfies Omit<WikiCollabSessionTokenPayload, "sub">,
        SESSION_TOKEN_LIFETIME,
        userId,
      ),

    disconnectUser: async (userId: string) => {
      const token = await signToken(
        { scope: "disconnect" } satisfies Omit<
          WikiCollabDisconnectTokenPayload,
          "sub"
        >,
        REQUEST_TOKEN_LIFETIME,
        userId,
      );

      await post("/disconnect", token, DISCONNECT_TIMEOUT_MILLISECONDS);
    },
  };
};
