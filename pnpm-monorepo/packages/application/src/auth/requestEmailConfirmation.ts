import { AuditEventType } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { sendEmailConfirmation } from "./emailConfirmationRequest.js";

export interface RequestEmailConfirmationOutput {
  readonly email_sent: boolean;
}

/**
 * The gate of the app lets an actor without a confirmed email call it. The
 * caller checks that the email is not confirmed yet.
 */
export const requestEmailConfirmation = (
  context: ApplicationContext,
  actor: Actor,
): Promise<RequestEmailConfirmationOutput> =>
  withSpan(context, "requestEmailConfirmation", async () => {
    const user = await context.prisma.user.findUnique({
      where: {
        id: actor.userId,
      },
      select: {
        email: true,
      },
    });
    const email = user?.email ?? "";

    const { requested } = await sendEmailConfirmation(context, {
      userId: actor.userId,
      email,
    });

    if (requested)
      await context.audit.create([
        {
          type: AuditEventType.EMAIL_CONFIRMATION_REQUESTED,
          data: {
            userId: actor.userId,
            email,
          },
          createdById: actor.userId,
        },
      ]);

    return { email_sent: requested };
  });
