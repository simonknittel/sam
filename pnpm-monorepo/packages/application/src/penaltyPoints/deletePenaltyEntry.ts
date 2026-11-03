import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { PenaltyEntryErrorMessage } from "./penaltyEntryErrors.js";
import {
  PENALTY_ENTRY_SELECT,
  toPenaltyEntryOutput,
  type PenaltyEntryOutput,
} from "./penaltyEntryOutput.js";

export const deletePenaltyEntryInputSchema = z.object({
  penalty_entry_id: idSchema.describe("The id of the penalty entry."),
});

/**
 * Soft-deletes a penalty entry. When the entry still counted, it notifies
 * the citizen of the entry. Requires `penaltyEntry;delete` and a citizen.
 *
 * @throws NotFoundError when the entry does not exist or is deleted already
 */
export const deletePenaltyEntry = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof deletePenaltyEntryInputSchema>,
): Promise<PenaltyEntryOutput> =>
  withSpan(context, "deletePenaltyEntry", async () => {
    requirePermission(actor, "penaltyEntry", "delete");
    const actorCitizen = requireCitizen(actor);
    const now = context.now();

    /**
     * The condition on `deletedAt` lets only one of two parallel requests
     * (a double click, a different tab) delete the entry. The other request
     * stops here and writes no audit event.
     */
    const [entry] = await context.prisma.penaltyEntry.updateManyAndReturn({
      where: { id: input.penalty_entry_id, deletedAt: null },
      data: { deletedAt: now, deletedById: actorCitizen.id },
      select: PENALTY_ENTRY_SELECT,
    });
    if (!entry) throw new NotFoundError(PenaltyEntryErrorMessage.NotFound);

    await context.audit.create([
      {
        type: AuditEventType.PENALTY_ENTRY_DELETED,
        data: {
          penaltyEntryId: entry.id,
          citizenId: entry.citizen.id,
          points: entry.points,
          reason: entry.reason,
        },
        createdById: actor.userId,
      },
    ]);

    // An expired entry does not count any more (see
    // `buildActivePenaltyEntryWhere()`), thus its deletion changes nothing
    // for the citizen
    const notifications =
      (entry.expiresAt === null || entry.expiresAt >= now) &&
      entry.citizen.id !== actorCitizen.id
        ? [
            {
              type: "PenaltyEntryDeleted",
              payload: { penaltyEntryId: entry.id },
            },
          ]
        : [];

    await triggerNotificationsAfterSave(context, notifications);

    return toPenaltyEntryOutput(entry);
  });
