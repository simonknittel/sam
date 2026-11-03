"use server";

import {
  ActionGate,
  createAuthenticatedAction,
} from "@/modules/actions/utils/createAction";
import { getApplicationContext, toActor } from "@/modules/application";
import { requestEmailConfirmation } from "@sam-monorepo/application";
import { redirect } from "next/navigation";
import * as z from "zod";

const schema = z.object({});

export const requestEmailConfirmationAction = createAuthenticatedAction(
  "requestEmailConfirmationAction",
  schema,
  async (formData, authentication) => {
    if (authentication.session.user.emailVerified) redirect("/clearance");

    const output = await requestEmailConfirmation(
      getApplicationContext(),
      await toActor(authentication.session),
    );

    return {
      success: "Bestätigungs-E-Mail angefordert.",
      ...(output.email_sent
        ? {}
        : { warning: "Die Bestätigungs-E-Mail konnte nicht gesendet werden." }),
    };
  },
  {
    // This action is how users get their email confirmed in the first place
    gate: ActionGate.None,
  },
);
