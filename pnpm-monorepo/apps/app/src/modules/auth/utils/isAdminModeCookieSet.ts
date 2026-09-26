import { cookies } from "next/headers";
import { ADMIN_MODE_COOKIE, ADMIN_MODE_COOKIE_VALUE } from "./adminCookies";

/** Only effective for a user with the admin role */
export const isAdminModeCookieSet = async () =>
  (await cookies()).get(ADMIN_MODE_COOKIE)?.value === ADMIN_MODE_COOKIE_VALUE;
