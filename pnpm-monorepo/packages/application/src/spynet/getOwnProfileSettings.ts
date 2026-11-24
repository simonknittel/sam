import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { CitizenErrorMessage } from "./citizenErrors.js";

export interface OwnProfileSettings {
  readonly timezone: string | null;
  readonly birthdayDay: number | null;
  readonly birthdayMonth: number | null;
}

export const getOwnProfileSettings = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<OwnProfileSettings> => {
  const citizen = requireCitizen(actor);

  const settings = await context.prisma.citizen.findUnique({
    where: { id: citizen.id },
    select: { timezone: true, birthdayDay: true, birthdayMonth: true },
  });
  if (!settings) throw new NotFoundError(CitizenErrorMessage.NotFound);

  return settings;
};
