import type { Session } from "next-auth";

/**
 * Label of the currently assumed user for the admin toolbar, or undefined
 * when the session is not an assumed one.
 */
export const getAssumedUserLabel = (session: Session) =>
  session.assumedByAdminId
    ? (session.user.name ?? session.user.email ?? session.user.id)
    : undefined;
