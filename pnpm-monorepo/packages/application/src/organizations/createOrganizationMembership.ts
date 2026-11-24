import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/browser";
import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { CitizenErrorMessage } from "../spynet/citizenErrors.js";
import { withSpan } from "../withSpan.js";
import { changeMembershipHistory } from "./membershipHistory.js";
import { OrganizationErrorMessage } from "./organizationErrors.js";

export const createOrganizationMembershipInputSchema = z.object({
  organization_id: idSchema,
  citizen_id: idSchema,
  type: z.enum([
    OrganizationMembershipType.MAIN,
    OrganizationMembershipType.AFFILIATE,
  ]),
  /** A checkbox: the form sends no value when it is clear */
  visibility: z
    .enum([
      OrganizationMembershipVisibility.PUBLIC,
      OrganizationMembershipVisibility.REDACTED,
    ])
    .default(OrganizationMembershipVisibility.PUBLIC),
  /** The value of the submit button "save and confirm" */
  confirmed: z.literal(ConfirmationStatus.CONFIRMED).optional(),
});

export type CreateOrganizationMembershipInput = z.infer<
  typeof createOrganizationMembershipInputSchema
>;

export interface CreateOrganizationMembershipOutput {
  readonly organization_id: string;
  readonly citizen_id: string;
  readonly type: CreateOrganizationMembershipInput["type"];
  /**
   * False also for a request to confirm without
   * `organizationMembership;confirm`
   */
  readonly confirmed: boolean;
}

/**
 * A request to confirm without `organizationMembership;confirm` creates an
 * entry that waits for the decision of a user who can confirm it.
 *
 * @throws ValidationError when the organization does not exist
 * @throws NotFoundError when the citizen does not exist or is deleted
 */
export const createOrganizationMembership = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateOrganizationMembershipInput,
): Promise<CreateOrganizationMembershipOutput> =>
  withSpan(context, "createOrganizationMembership", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "organizationMembership", "create");

    const confirmable =
      input.confirmed === ConfirmationStatus.CONFIRMED &&
      actor.authorize("organizationMembership", "confirm");

    const organization = await context.prisma.organization.findUnique({
      where: { id: input.organization_id },
      select: { id: true },
    });
    if (!organization)
      throw new ValidationError(OrganizationErrorMessage.OrganizationNotFound);

    await changeMembershipHistory(
      context,
      input.citizen_id,
      async (transaction) => {
        /**
         * A deleted citizen gets the same answer as an unknown id. On the
         * page of the citizen, the refresh shows that a different user
         * deleted it. On the page of an organization, the user enters the id,
         * and the refresh changes nothing.
         */
        const targetCitizen = await transaction.citizen.findUnique({
          where: { id: input.citizen_id, ...ACTIVE_CITIZEN_WHERE },
          select: { id: true },
        });
        if (!targetCitizen)
          throw new NotFoundError(CitizenErrorMessage.NotFound);

        await transaction.organizationMembershipHistoryEntry.create({
          data: {
            organizationId: input.organization_id,
            citizenId: input.citizen_id,
            type: input.type,
            visibility: input.visibility,
            createdById: citizen.id,
            ...(confirmable
              ? {
                  confirmed: ConfirmationStatus.CONFIRMED,
                  confirmedAt: context.now(),
                  confirmedById: citizen.id,
                }
              : {}),
          },
        });
      },
    );

    await context.audit.create([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED,
        data: {
          organizationId: input.organization_id,
          citizenId: input.citizen_id,
          type: input.type,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      organization_id: input.organization_id,
      citizen_id: input.citizen_id,
      type: input.type,
      confirmed: confirmable,
    };
  });
