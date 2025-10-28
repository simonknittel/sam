import { prisma } from "@/db";
import { env } from "@/env";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { emitEvents } from "@/modules/eventbridge/utils";
import { createId } from "@paralleldrive/cuid2";

interface Payload {
  userEmail: string;
  userId: string;
}

const handler = async (payload: Payload) => {
  if (await getUnleashFlag(UNLEASH_FLAG.DisableConfirmationEmail)) return;

  const emailConfirmationToken = createId();

  await prisma.emailConfirmationToken.create({
    data: {
      token: emailConfirmationToken,
      email: payload.userEmail,
      userId: payload.userId,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    },
  });

  await emitEvents([
    {
      Source: "App",
      DetailType: "EmailRequested",
      Detail: JSON.stringify({
        requestId: createId(),
        template: "emailConfirmation",
        messages: [
          {
            to: payload.userEmail,
            templateProps: {
              baseUrl: env.BASE_URL,
              host: env.HOST,
              token: emailConfirmationToken,
            },
          },
        ],
      }),
    },
  ]);
};

const event = {
  key: "email_confirmation",
  handler,
} as const;

export default event;
