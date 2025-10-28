import { env } from "@/env";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { Novu } from "@novu/api";
import type { TriggerEventRequestDto } from "@novu/api/models/components/triggereventrequestdto";
import { cache } from "react";

const CHUNK_SIZE = 100;

export const novu = Boolean(env.NOVU_SECRET_KEY && env.NOVU_SERVER_URL)
  ? new Novu({
      secretKey: env.NOVU_SECRET_KEY,
      serverURL: env.NOVU_SERVER_URL,
    })
  : null;

export const isNovuEnabled = cache(async () =>
  Boolean(
    (await getUnleashFlag(UNLEASH_FLAG.EnableNotificationsRework)) && novu,
  ),
);

export const publishNovuNotifications = async (
  events: TriggerEventRequestDto[],
) => {
  if (!(await isNovuEnabled())) return;

  // Split events into chunks of 100 to avoid limit of Novu SDK/API
  const chunks = [];
  for (let i = 0; i < events.length; i += CHUNK_SIZE) {
    chunks.push(events.slice(i, i + CHUNK_SIZE));
  }

  // Send notifications in bulk for each chunk
  for (const chunk of chunks) {
    await novu!.triggerBulk({
      events: chunk,
    });
  }
};
