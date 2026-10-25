import type { ApplicationContext } from "../context.js";
import { DEVELOPMENT_LOGIN_USER_WHERE } from "./developmentLoginUser.js";

/**
 * The development login has no Discord profile. It stands in for the
 * two-factor authentication of Discord, thus the admin passes the gate of
 * the two-factor authentication (see `isMissingTwoFactorAuthentication()`).
 * The next Discord login writes the real status again. The host checks that
 * it runs in development.
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
