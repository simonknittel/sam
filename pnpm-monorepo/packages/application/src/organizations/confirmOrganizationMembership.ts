import { ConfirmationStatus } from "@sam-monorepo/database/browser";
import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { changeMembershipHistory } from "./membershipHistory.js";
import { OrganizationErrorMessage } from "./organizationErrors.js";

export const confirmOrganizationMembershipInputSchema = z.object({
  history_entry_id: idSchema,
  organization_id: idSchema,
  citizen_id: idSchema,
  confirmed: z.enum([
    ConfirmationStatus.CONFIRMED,
    ConfirmationStatus.FALSE_REPORT,
  ]),
});

export type ConfirmOrganizationMembershipInput = z.infer<
  typeof confirmOrganizationMembershipInputSchema
>;

export interface ConfirmOrganizationMembershipOutput {
  readonly history_entry_id: string;
  readonly confirmed: ConfirmOrganizationMembershipInput["confirmed"];
}

/**
 * The replay of the membership history adds or removes the active membership.
 *
 * @throws NotFoundError when the entry does not exist for the organization and
 * the citizen, or when the citizen is deleted
 * @throws ConflictError when somebody decided about the entry already
 */
export const confirmOrganizationMembership = (
  context: ApplicationContext,
  actor: Actor,
  input: ConfirmOrganizationMembershipInput,
): Promise<ConfirmOrganizationMembershipOutput> =>
  withSpan(context, "confirmOrganizationMembership", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "organizationMembership", "confirm");

    await changeMembershipHistory(
      context,
      input.citizen_id,
      async (transaction) => {
        const entry =
          await transaction.organizationMembershipHistoryEntry.findUnique({
            where: {
              id: input.history_entry_id,
              organizationId: input.organization_id,
              citizenId: input.citizen_id,
              /** A deleted citizen gets the same answer as an unknown entry */
              citizen: ACTIVE_CITIZEN_WHERE,
            },
            select: { id: true },
          });
        if (!entry)
          throw new NotFoundError(
            OrganizationErrorMessage.MembershipEntryNotFound,
          );

        /**
         * Only an entry without a confirmation changes. Thus a second
         * confirmation changes nothing and writes no second audit event.
         */
        const { count } =
          await transaction.organizationMembershipHistoryEntry.updateMany({
            where: { id: entry.id, confirmedAt: null },
            data: {
              confirmed: input.confirmed,
              confirmedAt: context.now(),
              confirmedById: citizen.id,
            },
          });
        if (count === 0)
          throw new ConflictError(OrganizationErrorMessage.AlreadyConfirmed);
      },
    );

    await context.audit.create([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
        data: {
          historyEntryId: input.history_entry_id,
          citizenId: input.citizen_id,
          confirmed: input.confirmed,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      history_entry_id: input.history_entry_id,
      confirmed: input.confirmed,
    };
  });
