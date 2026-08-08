import type { Session } from "next-auth";

/**
 * Label of the currently assumed user for the AdminEnabler, or undefined
 * when the session is not an assumed one.
 */
export const getAssumedUserLabel = (session: Session) =>
  session.assumedByAdmin
    ? (session.user.name ?? session.user.email ?? session.user.id)
    : undefined;
