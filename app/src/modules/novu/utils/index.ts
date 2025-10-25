import { env } from "@/env";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { Novu } from "@novu/api";

export const isNovuEnabled = async () =>
  (await getUnleashFlag(UNLEASH_FLAG.EnableNotificationsRework)) &&
  Boolean(
    env.NOVA_APPLICATION_IDENTIFIER &&
      env.NOVA_SECRET_KEY &&
      env.NOVA_SERVER_URL &&
      env.NOVA_SOCKET_URL,
  );

export const novu = (await isNovuEnabled())
  ? new Novu({
      secretKey: env.NOVA_SECRET_KEY,
      serverURL: env.NOVA_SERVER_URL,
    })
  : null;
