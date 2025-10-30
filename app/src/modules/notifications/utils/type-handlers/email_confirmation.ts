import { prisma } from "@/db";
import { env } from "@/env";
import { emitEvents } from "@/modules/eventbridge/utils";
import { createId } from "@paralleldrive/cuid2";

interface Payload {
  userEmail: string;
  userId: string;
}

export const emailConfirmationHandler = async (payload: Payload) => {
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
        requestId: createId(),
      }),
    },
  ]);
};
