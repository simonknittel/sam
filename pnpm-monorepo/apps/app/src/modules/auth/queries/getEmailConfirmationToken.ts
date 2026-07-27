import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { EmailConfirmationToken } from "@sam-monorepo/database/client";

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
