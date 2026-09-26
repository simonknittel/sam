"use server";

import {
  ActionGate,
  createAuthenticatedAction,
} from "@/modules/actions/utils/createAction";
import { getServerCookieOptions } from "@/modules/common/utils/getServerCookieOptions";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  ADMIN_MODE_COOKIE,
  ADMIN_MODE_COOKIE_MAX_AGE,
  ADMIN_MODE_COOKIE_VALUE,
} from "../utils/adminCookies";

const schema = z.object({
  enabled: z.stringbool(),
});

export const setAdminMode = createAuthenticatedAction(
  "setAdminMode",
  schema,
  async (formData, authentication, data, t) => {
    if (authentication.session.assumedByAdminId)
      return {
        error: "Admin mode has no effect while you assume a user.",
        requestPayload: formData,
      };

    const cookieStore = await cookies();

    if (data.enabled) {
      cookieStore.set(
        ADMIN_MODE_COOKIE,
        ADMIN_MODE_COOKIE_VALUE,
        getServerCookieOptions(ADMIN_MODE_COOKIE_MAX_AGE),
      );
    } else {
      cookieStore.delete(ADMIN_MODE_COOKIE);
    }

    return {
      success: t("Common.successfullySaved"),
    };
  },
  { gate: ActionGate.Admin },
);
