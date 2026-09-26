import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { ADMIN_MODE_COOKIE, ADMIN_MODE_COOKIE_VALUE } from "./adminCookies";

/**
 * Admin mode applies only to an admin with their own account. While an admin
 * assumes a user, the permissions of that user apply, also when the assumed
 * user is an admin.
 */
export const isAdminModeActive = async (session: Session) =>
  session.user.role === "admin" &&
  !session.assumedByAdminId &&
  (await cookies()).get(ADMIN_MODE_COOKIE)?.value === ADMIN_MODE_COOKIE_VALUE;
