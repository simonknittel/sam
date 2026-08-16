"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { redirect } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";

const schema = z.object({});

export const requestEmailConfirmationAction = createAuthenticatedAction(
  "requestEmailConfirmationAction",
  schema,
  async (formData, authentication) => {
    if (authentication.session.user.emailVerified) redirect("/clearance");

    try {
      await triggerNotifications([
        {
          type: "EmailConfirmation",
          payload: {
            userId: authentication.session.user.id,
            userEmail: authentication.session.user.email!,
          },
        },
      ]);

      await createAuditEvents([
        {
          type: AuditEventType.EMAIL_CONFIRMATION_REQUESTED,
          data: {
            userId: authentication.session.user.id,
            email: authentication.session.user.email!,
          },
          createdById: authentication.session.user.id,
        },
      ]);
    } catch (error) {
      log.error("Error while requesting email confirmation", {
        path: "/email-confirmation",
        error: serializeError(error),
      });
    }

    return {
      success: "Bestätigungs-E-Mail angefordert.",
    };
  },
  {
    // This action is how users get their email confirmed in the first place
    skipEmailConfirmationAndClearanceGates: true,
  },
);
