import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

export interface IsWelcomeDayOfCitizenInput {
  readonly citizenId: string;
}

/**
 * Never throws: no page must fail because of a greeting. No permission check,
 * see the README.
 */
export const isWelcomeDayOfCitizen = async (
  context: ApplicationContext,
  input: IsWelcomeDayOfCitizenInput,
): Promise<boolean> => {
  try {
    const citizen = await context.prisma.citizen.findUnique({
      where: { id: input.citizenId },
      select: { welcomedAt: true, timezone: true },
    });
    if (!citizen?.welcomedAt) return false;

    const timeZone = citizen.timezone ?? ORGANIZATION_TIMEZONE;

    return (
      getLocalDateKey(citizen.welcomedAt, timeZone) ===
      getLocalDateKey(context.now(), timeZone)
    );
  } catch (error) {
    context.log.warn("Failed to resolve the welcome day", {
      citizenId: input.citizenId,
      error,
    });

    return false;
  }
};
