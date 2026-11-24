import {
  ConfirmationStatus,
  OrganizationMembershipType,
} from "@sam-monorepo/database/browser";
import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { changeMembershipHistory } from "./membershipHistory.js";
import { OrganizationErrorMessage } from "./organizationErrors.js";

export const deleteOrganizationMembershipInputSchema = z.object({
  organization_id: idSchema,
  citizen_id: idSchema,
});

export type DeleteOrganizationMembershipInput = z.infer<
  typeof deleteOrganizationMembershipInputSchema
>;

export interface DeleteOrganizationMembershipOutput {
  readonly organization_id: string;
  readonly citizen_id: string;
}

/**
 * The history entry LEFT ends the membership (see `changeMembershipHistory()`).
 *
 * @throws NotFoundError when the citizen is not a member, or is deleted
 */
export const deleteOrganizationMembership = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteOrganizationMembershipInput,
): Promise<DeleteOrganizationMembershipOutput> =>
  withSpan(context, "deleteOrganizationMembership", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "organizationMembership", "delete");

    await changeMembershipHistory(
      context,
      input.citizen_id,
      async (transaction) => {
        /**
         * A different user or tab removed the membership or deleted the
         * citizen before. A deleted citizen gets the same answer as a removed
         * membership.
         */
        const membership =
          await transaction.activeOrganizationMembership.findUnique({
            where: {
              organizationId_citizenId: {
                organizationId: input.organization_id,
                citizenId: input.citizen_id,
              },
              citizen: ACTIVE_CITIZEN_WHERE,
            },
            select: { visibility: true },
          });
        if (!membership)
          throw new NotFoundError(OrganizationErrorMessage.MembershipNotFound);

        await transaction.organizationMembershipHistoryEntry.create({
          data: {
            organizationId: input.organization_id,
            citizenId: input.citizen_id,
            type: OrganizationMembershipType.LEFT,
            visibility: membership.visibility,
            createdById: citizen.id,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: context.now(),
            confirmedById: citizen.id,
          },
        });
      },
    );

    await context.audit.create([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED,
        data: {
          organizationId: input.organization_id,
          citizenId: input.citizen_id,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      organization_id: input.organization_id,
      citizen_id: input.citizen_id,
    };
  });
