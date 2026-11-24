import type { ApplicationContext } from "../context.js";

/** One transaction, so the user cannot keep a token of a confirmed email */
export const markEmailConfirmed = async (
  { prisma }: Pick<ApplicationContext, "prisma">,
  userId: string,
  now: Date,
): Promise<void> => {
  await prisma.$transaction([
    prisma.emailConfirmationToken.deleteMany({
      where: {
        userId,
      },
    }),

    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        emailVerified: now,
      },
    }),
  ]);
};
