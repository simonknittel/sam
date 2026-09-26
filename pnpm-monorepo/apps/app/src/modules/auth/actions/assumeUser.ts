"use server";

import { prisma } from "@/db";
import { createAdminAction } from "@/modules/actions/utils/createAdminAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getServerCookieOptions } from "@/modules/common/utils/getServerCookieOptions";
import { ASSUMABLE_USER_WHERE } from "@/modules/users/queries/getAssumableUsers";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  ADMIN_MODE_COOKIE,
  ASSUME_USER_COOKIE,
  ASSUME_USER_COOKIE_MAX_AGE,
} from "../utils/adminCookies";
import { getAssumeUserEndedEvent } from "../utils/getAssumeUserEndedEvent";

const schema = z.object({
  userId: z.cuid(),
});

export const assumeUser = createAdminAction(
  "assumeUser",
  schema,
  async (formData, authentication, data, t) => {
    const { session } = authentication;
    const adminId = session.assumedByAdminId ?? session.user.id;

    // The session ignores the cookie for the own account, thus the audit
    // log would record an assume without effect
    if (data.userId === adminId)
      return {
        error: "You can't assume your own account.",
        requestPayload: formData,
      };

    const user = await prisma.user.findFirst({
      where: {
        id: data.userId,
        ...ASSUMABLE_USER_WHERE,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (!user)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const previousAssumeEndedEvent = getAssumeUserEndedEvent(session);

    await createAuditEvents([
      ...(previousAssumeEndedEvent ? [previousAssumeEndedEvent] : []),
      {
        type: AuditEventType.ASSUME_USER_STARTED,
        data: {
          assumedUserId: user.id,
          assumedUserName: user.name,
        },
        createdById: adminId,
      },
    ]);

    const cookieStore = await cookies();
    // The permissions of the assumed user must apply, not the admin mode
    cookieStore.delete(ADMIN_MODE_COOKIE);
    cookieStore.set(
      ASSUME_USER_COOKIE,
      user.id,
      getServerCookieOptions(ASSUME_USER_COOKIE_MAX_AGE),
    );

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
