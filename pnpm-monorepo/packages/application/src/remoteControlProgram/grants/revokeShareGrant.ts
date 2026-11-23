import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { NotFoundError } from "../../errors.js";
import { idSchema } from "../../pagination.js";
import { withSpan } from "../../withSpan.js";
import { ShareGrantErrorMessage } from "./shareGrantErrors.js";

export const revokeShareGrantInputSchema = z.object({
  grant_id: idSchema,
});

export type RevokeShareGrantInput = z.output<
  typeof revokeShareGrantInputSchema
>;

export interface RevokeShareGrantOutput {
  readonly id: string;
  readonly revokedAt: Date;
  /** False when the grant was already revoked: nothing changed */
  readonly isChanged: boolean;
}

/**
 * The owner (the actor) revokes the own grant. Writes
 * `REMOTE_CONTROL_PROGRAM_SHARE_GRANT_REVOKED`. A second revocation changes
 * nothing and writes no event. It needs no permission: an owner who lost
 * `remoteControlProgram;use` can still stop the sharing.
 *
 * The data stops within seconds (principle 5) without more steps: the loaders
 * of the access keep no cache, thus the next read and the next delivery
 * (`findWatchingViewers()`) load the grants again.
 *
 * @throws ForbiddenError when the actor has no citizen
 * @throws NotFoundError when the actor has no grant with the id, also for the
 * grant of a different owner (`ShareGrantErrorMessage.GrantNotFound`)
 */
export const revokeShareGrant = (
  context: ApplicationContext,
  actor: Actor,
  input: RevokeShareGrantInput,
): Promise<RevokeShareGrantOutput> =>
  withSpan(context, "revokeShareGrant", async () => {
    const citizen = requireCitizen(actor);
    const now = context.now();
    const ownGrantWhere = { id: input.grant_id, ownerId: citizen.id };

    // Only the first revocation matches `revokedAt: null`, also when two revocations run at the same time
    const { count } = await context.prisma.shareGrant.updateMany({
      where: { ...ownGrantWhere, revokedAt: null },
      data: { revokedAt: now, revokedById: citizen.id },
    });

    if (count === 0) {
      const grant = await context.prisma.shareGrant.findFirst({
        where: ownGrantWhere,
        select: { revokedAt: true },
      });
      if (!grant?.revokedAt)
        throw new NotFoundError(ShareGrantErrorMessage.GrantNotFound);

      return {
        id: input.grant_id,
        revokedAt: grant.revokedAt,
        isChanged: false,
      };
    }

    await context.audit.create([
      {
        type: AuditEventType.REMOTE_CONTROL_PROGRAM_SHARE_GRANT_REVOKED,
        data: { grantId: input.grant_id, ownerCitizenId: citizen.id },
        createdById: actor.userId,
      },
    ]);

    return { id: input.grant_id, revokedAt: now, isChanged: true };
  });
