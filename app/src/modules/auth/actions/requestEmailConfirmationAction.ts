"use server";

import { authenticate } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { triggerNotification } from "@/modules/notifications/components/utils/triggerNotification";
import { redirect } from "next/navigation";
import { serializeError } from "serialize-error";

export const requestEmailConfirmationAction = async () => {
  const authentication = await authenticate();
  if (!authentication) {
    void log.info("Unauthorized request to action", {
      actionName: "requestEmailConfirmationAction",
      reason: "No session",
    });

    throw new Error("Unauthorized");
  }

  if (authentication.session.user.emailVerified) redirect("/clearance");

  try {
    await triggerNotification("email_confirmation", {
      userId: authentication.session.user.id,
      userEmail: authentication.session.user.email!,
    });
  } catch (error) {
    void log.error("Error while requesting email confirmation", {
      path: "/email-confirmation",
      error: serializeError(error),
    });
  }
};
