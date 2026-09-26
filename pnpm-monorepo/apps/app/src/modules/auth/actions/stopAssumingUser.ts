"use server";

import {
  ActionGate,
  createAuthenticatedAction,
} from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { cookies } from "next/headers";
import * as z from "zod";
import { ASSUME_USER_COOKIE } from "../utils/adminCookies";
import { getAssumeUserEndedEvent } from "../utils/getAssumeUserEndedEvent";

const schema = z.object({});

export const stopAssumingUser = createAuthenticatedAction(
  "stopAssumingUser",
  schema,
  async (formData, authentication, data, t) => {
    const assumeEndedEvent = getAssumeUserEndedEvent(authentication.session);
    if (assumeEndedEvent) await createAuditEvents([assumeEndedEvent]);

    (await cookies()).delete(ASSUME_USER_COOKIE);

    return {
      success: t("Common.successfullySaved"),
    };
  },
  { gate: ActionGate.Admin },
);
