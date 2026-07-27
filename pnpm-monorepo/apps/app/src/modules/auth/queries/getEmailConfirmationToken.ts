import { prisma } from "@/db";
import type { EmailConfirmationToken } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getEmailConfirmationToken = withTrace(
  "getEmailConfirmationToken",
  async (token: EmailConfirmationToken["token"]) => {
    return prisma.emailConfirmationToken.findUnique({
      where: {
        token,
        expires: {
          gt: new Date(),
        },
      },
    });
  },
);
