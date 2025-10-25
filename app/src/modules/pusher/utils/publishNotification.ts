import { env } from "@/env";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { beamsClient } from "./beamsClient";

export const publishPusherNotification = withTrace(
  "publishNotification",
  async (
    interests: string[],
    title: string,
    body: string,
    deep_link?: string,
  ) => {
    if (!beamsClient) return;

    await beamsClient.publishToInterests(interests, {
      web: {
        notification: {
          title: `${title} | S.A.M.`,
          body,
          deep_link: deep_link ? `${env.BASE_URL}${deep_link}` : undefined,
          icon: `${env.BASE_URL}/logo-white-on-black.png`,
        },
      },
    });
  },
);
