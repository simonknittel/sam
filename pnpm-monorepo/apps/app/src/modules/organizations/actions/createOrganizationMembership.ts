"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";
import {
  changeMembershipHistory,
  RejectedChangeError,
} from "../utils/changeMembershipHistory";

const schema = z.object({
  organizationId: z.cuid(),
  citizenId: z.cuid(),
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

export const createOrganizationMembership = createAuthenticatedAction(
  "createOrganizationMembership",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!(await authentication.authorize("organizationMembership", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const entityId = authentication.session.entity.id;

    const confirmable =
      data.confirmed === ConfirmationStatus.CONFIRMED &&
      (await authentication.authorize("organizationMembership", "confirm"));

    /**
     * Create the history entry. The active memberships come from the
     * confirmed history entries, see changeMembershipHistory().
     */
    const isCreated = await changeMembershipHistory(
      data.citizenId,
      async (transaction) => {
        /**
         * The user enters one of the IDs. A deleted citizen gets the same
         * answer as an unknown ID. Organizations cannot be deleted.
         */
        const citizen = await transaction.citizen.findUnique({
          where: { id: data.citizenId, ...ACTIVE_CITIZEN_WHERE },
          select: { id: true },
        });
        const organization = await transaction.organization.findUnique({
          where: { id: data.organizationId },
          select: { id: true },
        });
        if (!citizen || !organization) throw new RejectedChangeError();

        await transaction.organizationMembershipHistoryEntry.create({
          data: {
            organizationId: data.organizationId,
            citizenId: data.citizenId,
            type: data.type,
            visibility: data.visibility,
            createdById: entityId,
            ...(confirmable
              ? {
                  confirmed: ConfirmationStatus.CONFIRMED,
                  confirmedAt: new Date(),
                  confirmedById: entityId,
                }
              : {}),
          },
        });
      },
    )
      .then(() => true)
      .catch((error: unknown) => {
        if (error instanceof RejectedChangeError) return false;
        throw error;
      });
    if (!isCreated)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED,
        data: {
          organizationId: data.organizationId,
          citizenId: data.citizenId,
          type: data.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
