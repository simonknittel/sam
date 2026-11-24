import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  DELETED_CITIZEN_LABEL,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { CitizenErrorMessage } from "./citizenErrors.js";

export const deleteCitizenInputSchema = z.object({
  citizen_id: idSchema,
});

export type DeleteCitizenInput = z.infer<typeof deleteCitizenInputSchema>;

export interface DeleteCitizenOutput {
  readonly citizen_id: string;
}

/**
 * Soft delete: the citizen and all its entries stay in the database and are
 * hidden (see `Citizen.deletedAt`). The login continues as a login without a
 * citizen. The log tables and the system log name the author by `User.name`,
 * thus the login gets the label of a deleted citizen.
 */
export const deleteCitizen = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteCitizenInput,
): Promise<DeleteCitizenOutput> =>
  withSpan(context, "deleteCitizen", async () => {
    requirePermission(actor, "citizen", "delete");

    /**
     * The login update comes first, because it finds the login through the
     * link
     */
    const [, deletedCitizens] = await context.prisma.$transaction([
      context.prisma.user.updateMany({
        where: { citizen: { id: input.citizen_id, ...ACTIVE_CITIZEN_WHERE } },
        data: { name: DELETED_CITIZEN_LABEL },
      }),

      context.prisma.citizen.updateManyAndReturn({
        where: { id: input.citizen_id, ...ACTIVE_CITIZEN_WHERE },
        data: {
          deletedAt: context.now(),
          deletedById: actor.citizen?.id ?? null,
          userId: null,
        },
        select: { spectrumId: true },
      }),
    ]);

    const deletedCitizen = deletedCitizens[0];
    /** A different tab or user deleted the citizen before */
    if (!deletedCitizen) throw new NotFoundError(CitizenErrorMessage.NotFound);

    await context.audit.create([
      {
        type: AuditEventType.CITIZEN_DELETED,
        data: {
          citizenId: input.citizen_id,
          spectrumId: deletedCitizen.spectrumId || "",
        },
        createdById: actor.userId,
      },
    ]);

    return { citizen_id: input.citizen_id };
  });
