import type { Session } from "next-auth";

/**
 * Whether an admin is behind the session: an admin with their own account,
 * or an admin who assumes a different user. An assumed session carries the
 * role of the assumed user, thus the role alone is not sufficient.
 */
export const isAdminBehindSession = (session: Session) =>
  session.user.role === "admin" || session.assumedByAdminId !== null;
