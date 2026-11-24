import type { ApplicationContext } from "../context.js";
import { DEVELOPMENT_LOGIN_USER_WHERE } from "./developmentLoginUser.js";

/**
 * The development login has no Discord profile, thus it sets the status that
 * the gate of the two-factor authentication needs. The next Discord login
 * writes the real status again. No permission check, see the README.
 */
export const enableDevelopmentLoginTwoFactor = async (
  context: ApplicationContext,
  userId: string,
): Promise<void> => {
  await context.prisma.user.updateMany({
    where: { ...DEVELOPMENT_LOGIN_USER_WHERE, id: userId },
    data: { discordTwoFactorEnabled: true },
  });
};
