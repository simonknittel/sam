"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  subscription: z.preprocess(
    (str) => {
      if (typeof str !== "string") return str;
      return JSON.parse(str) as unknown;
    },
    z.object({
      endpoint: z.string(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    }),
  ),
});

export const subscribeWebPush = createAuthenticatedAction(
  "subscribeWebPush",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     *
     */
    const subscription = await prisma.webPushSubscription.upsert({
      where: {
        endpoint: data.subscription.endpoint,
      },
      update: {
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
      },
      create: {
        citizenId: authentication.session.entity.id,
        endpoint: data.subscription.endpoint,
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
      },
      select: {
        id: true,
      },
    });

    /**
     * Trigger test notification
     */
    await triggerNotifications([
      {
        type: "WebPushSubscribed",
        payload: {
          subscriptionId: subscription.id,
        },
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/account/notifications");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
