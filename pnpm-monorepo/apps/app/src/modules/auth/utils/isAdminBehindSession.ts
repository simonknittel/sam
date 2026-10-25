import { UserRole } from "@sam-monorepo/database/browser";
import type { Session } from "next-auth";

/**
 * Whether an admin is behind the session: an admin with their own account,
 * or an admin who assumes a different user. An assumed session carries the
 * role of the assumed user, thus the role alone is not sufficient. An admin
 * without the two-factor authentication of Discord gets no admin tools.
 */
export const isAdminBehindSession = (session: Session) =>
  (session.user.role === UserRole.ADMIN || Boolean(session.assumedByAdminId)) &&
  session.discordTwoFactorEnabled === true;

/**
 * The user id of the admin behind the session: the id of the admin during
 * an assume, else the own id. Call it only after a check with
 * `isAdminBehindSession()`.
 */
export const getAdminUserIdBehindSession = (session: Session) =>
  session.assumedByAdminId ?? session.user.id;
