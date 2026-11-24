import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { NotificationErrorMessage } from "./notificationErrors.js";

export const deleteOwnWebPushSubscriptionInputSchema = z.object({
  subscription_id: idSchema,
});

export type DeleteOwnWebPushSubscriptionInput = z.output<
  typeof deleteOwnWebPushSubscriptionInputSchema
>;

export interface DeleteOwnWebPushSubscriptionOutput {
  readonly subscription_id: string;
}

/** The use case cannot take back the permission of the browser */
export const deleteOwnWebPushSubscription = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteOwnWebPushSubscriptionInput,
): Promise<DeleteOwnWebPushSubscriptionOutput> =>
  withSpan(context, "deleteOwnWebPushSubscription", async () => {
    const citizenId = requireCitizen(actor).id;

    /**
     * The citizen in the condition makes the id of a subscription of a
     * different citizen a no-op.
     */
    const { count } = await context.prisma.webPushSubscription.deleteMany({
      where: {
        id: input.subscription_id,
        citizenId,
      },
    });
    if (count === 0)
      throw new NotFoundError(
        NotificationErrorMessage.WebPushSubscriptionNotFound,
      );

    await context.audit.create([
      {
        type: AuditEventType.WEB_PUSH_SUBSCRIPTION_DELETED,
        data: {
          subscriptionId: input.subscription_id,
          citizenId,
        },
        createdById: actor.userId,
      },
    ]);

    return { subscription_id: input.subscription_id };
  });
