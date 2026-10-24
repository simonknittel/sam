import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";

/**
 * The citizens that a write adds must exist and must not be deleted, like
 * the choices of the citizen picker of the forms
 *
 * @param citizenIds The citizens that the write adds
 * @param errorMessage The message of the feature for the `ValidationError`
 * @throws ValidationError when a citizen does not exist or is deleted
 */
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
