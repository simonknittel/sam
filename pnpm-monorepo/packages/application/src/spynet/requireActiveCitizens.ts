import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";

/** The same rule as the citizen picker of the forms */
export const requireActiveCitizens = async (
  context: Pick<ApplicationContext, "prisma">,
  citizenIds: readonly string[],
  errorMessage: string,
) => {
  const uniqueCitizenIds = [...new Set(citizenIds)];
  if (uniqueCitizenIds.length <= 0) return;

  const activeCount = await context.prisma.citizen.count({
    where: { id: { in: uniqueCitizenIds }, ...ACTIVE_CITIZEN_WHERE },
  });
  if (activeCount !== uniqueCitizenIds.length)
    throw new ValidationError(errorMessage);
};
