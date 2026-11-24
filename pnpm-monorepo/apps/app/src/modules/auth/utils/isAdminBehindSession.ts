import { UserRole } from "@sam-monorepo/database/browser";
import type { Session } from "next-auth";

/**
 * An assumed session carries the role of the assumed user, thus the role alone
 * is not sufficient.
 */
export const isAdminBehindSession = (session: Session) =>
  (session.user.role === UserRole.ADMIN || Boolean(session.assumedByAdminId)) &&
  session.discordTwoFactorEnabled === true;

/** Call it only after a check with `isAdminBehindSession()` */
export const getAdminUserIdBehindSession = (session: Session) =>
  session.assumedByAdminId ?? session.user.id;
