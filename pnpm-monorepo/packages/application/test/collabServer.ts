import type {
  ApplicationContext,
  WikiCollabSession,
  WikiPageContentReplacement,
} from "../src/context.js";

interface TestCollabServerOptions {
  /** Each replacement fails like a collab server that cannot be reached */
  readonly failsReplace?: boolean;
  /** Each disconnect fails like a collab server that cannot be reached */
  readonly failsDisconnect?: boolean;
}

/**
 * The collab server of the tests. It records the replacements that it takes,
 * the sessions and the disconnected users, in the sequence of the calls. A
 * session token holds the page and the user, thus a test can compare it.
 */
export const createTestCollabServer = ({
  failsReplace = false,
  failsDisconnect = false,
}: TestCollabServerOptions = {}) => {
  const replacements: WikiPageContentReplacement[] = [];
  const sessions: WikiCollabSession[] = [];
  const disconnectedUserIds: string[] = [];

  const collab: NonNullable<ApplicationContext["collab"]> = {
    replaceContent: async (replacement) => {
      if (failsReplace)
        throw new Error("The test collab server does not take content");

      replacements.push(replacement);
    },
    createSessionToken: async (session) => {
      sessions.push(session);
      return `test-session-token:${session.pageId}:${session.userId}`;
    },
    disconnectUser: async (userId) => {
      if (failsDisconnect)
        throw new Error("The test collab server cannot be reached");

      disconnectedUserIds.push(userId);
    },
  };

  return { collab, replacements, sessions, disconnectedUserIds };
};
