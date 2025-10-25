import { env } from "@/env";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { Novu } from "@novu/api";
import { cache } from "react";

export const isNovuEnabled = cache(
  async () =>
    (await getUnleashFlag(UNLEASH_FLAG.EnableNotificationsRework)) &&
    Boolean(
      env.NOVU_APPLICATION_IDENTIFIER &&
        env.NOVU_SECRET_KEY &&
        env.NOVU_SERVER_URL &&
        env.NOVU_SOCKET_URL,
    ),
);

export const novu =
  env.NOVU_SECRET_KEY && env.NOVU_SERVER_URL
    ? new Novu({
        secretKey: env.NOVU_SECRET_KEY,
        serverURL: env.NOVU_SERVER_URL,
      })
    : null;
