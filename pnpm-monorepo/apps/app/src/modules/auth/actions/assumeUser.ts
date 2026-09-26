"use server";

import { prisma } from "@/db";
import {
  ActionGate,
  createAuthenticatedAction,
} from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getServerCookieOptions } from "@/modules/common/utils/getServerCookieOptions";
import { ASSUMABLE_USER_WHERE } from "@/modules/users/queries/getAssumableUsers";
import { cookies } from "next/headers";
import * as z from "zod";
import {
  ADMIN_MODE_COOKIE,
  ASSUME_USER_COOKIE,
  ASSUME_USER_COOKIE_MAX_AGE,
} from "../utils/adminCookies";
import { getAssumeUserEndedEvent } from "../utils/getAssumeUserEndedEvent";

/** A cuid has 25 characters; the limit only stops oversized input */
const USER_ID_MAX_LENGTH = 32;

const schema = z.object({
  userId: z.cuid().max(USER_ID_MAX_LENGTH),
});

export const assumeUser = createAuthenticatedAction(
  "assumeUser",
  schema,
  async (formData, authentication, data, t) => {
    const { session } = authentication;
    const adminId = session.assumedByAdminId ?? session.user.id;

    // The session ignores the cookie for the own account, thus the audit
    // log would record an assume without effect
    if (data.userId === adminId)
      return {
        error: "You cannot assume your own account.",
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

    // A separate write gives the end of the previous assume an earlier
    // timestamp, thus the system log shows the two events in order
    const previousAssumeEndedEvent = getAssumeUserEndedEvent(session);
    if (previousAssumeEndedEvent)
      await createAuditEvents([previousAssumeEndedEvent]);

    await createAuditEvents([
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
  { gate: ActionGate.Admin },
);
