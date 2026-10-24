import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  isAllowedWebPushEndpointUrl,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

/**
 * The endpoints of the push services are much shorter. The limit bounds the
 * input.
 */
const MAXIMUM_WEB_PUSH_ENDPOINT_LENGTH = 2048;

/**
 * The keys are Base64url text: `p256dh` has 87 characters and `auth` 22. The
 * limit bounds the input.
 */
const MAXIMUM_WEB_PUSH_KEY_LENGTH = 512;

export const subscribeWebPushInputSchema = z.object({
  subscription: z.object({
    endpoint: z
      .string()
      .max(MAXIMUM_WEB_PUSH_ENDPOINT_LENGTH)
      .refine(isAllowedWebPushEndpointUrl),
    keys: z.object({
      p256dh: z.string().max(MAXIMUM_WEB_PUSH_KEY_LENGTH),
      auth: z.string().max(MAXIMUM_WEB_PUSH_KEY_LENGTH),
    }),
  }),
});

export type SubscribeWebPushInput = z.output<
  typeof subscribeWebPushInputSchema
>;

export interface SubscribeWebPushOutput {
  readonly subscription_id: string;
  readonly notifications_sent: boolean;
}

interface SubscriptionData {
  readonly citizenId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

/** Changes the keys of the subscription of the endpoint of the own citizen */
const updateOwnSubscription = async (
  context: ApplicationContext,
  { citizenId, endpoint, p256dh, auth }: SubscriptionData,
) => {
  const [subscription] =
    await context.prisma.webPushSubscription.updateManyAndReturn({
      where: { endpoint, citizenId },
      data: { p256dh, auth },
      select: { id: true },
    });

  return subscription?.id;
};

/**
 * Saves the subscription and gives its id. The unique constraint of the
 * endpoint refuses the endpoint of a different citizen. A parallel save of
 * the same citizen can create the row first; then the keys change.
 */
const saveSubscription = async (
  context: ApplicationContext,
  data: SubscriptionData,
) => {
  const updatedId = await updateOwnSubscription(context, data);
  if (updatedId) return updatedId;

  try {
    const { id } = await context.prisma.webPushSubscription.create({
      data,
      select: { id: true },
    });
    return id;
  } catch (error) {
    if (!isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
      throw error;

    const parallelId = await updateOwnSubscription(context, data);
    if (parallelId) return parallelId;

    throw new ForbiddenError(
      "The web push endpoint is the subscription of a different citizen",
      { cause: error },
    );
  }
};

/**
 * Saves the web push subscription of a browser for the citizen of the actor.
 * The endpoint identifies the subscription: a second save of the same
 * endpoint changes only its keys. A test notification confirms the
 * subscription on the device.
 *
 * @throws ForbiddenError for a user without a citizen, or when the endpoint
 * is the subscription of a different citizen
 */
export const subscribeWebPush = (
  context: ApplicationContext,
  actor: Actor,
  input: SubscribeWebPushInput,
): Promise<SubscribeWebPushOutput> =>
  withSpan(context, "subscribeWebPush", async () => {
    const citizenId = requireCitizen(actor).id;

    const subscriptionId = await saveSubscription(context, {
      citizenId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
    });

    await context.audit.create([
      {
        type: AuditEventType.WEB_PUSH_SUBSCRIBED,
        data: {
          subscriptionId,
          citizenId,
        },
        createdById: actor.userId,
      },
    ]);

    /**
     * The test notification only confirms the subscription, which is saved
     * already. A failure must not make the user subscribe again: each new
     * subscription of the browser gets a new endpoint.
     */
    const notificationsSent = await triggerNotificationsAfterSave(context, [
      {
        type: "WebPushSubscribed",
        payload: {
          subscriptionId,
        },
      },
    ]);

    return {
      subscription_id: subscriptionId,
      notifications_sent: notificationsSent,
    };
  });
