"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
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
});

export const deleteOrganizationMembership = createAuthenticatedAction(
  "deleteOrganizationMembership",
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
    if (!(await authentication.authorize("organizationMembership", "delete")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const entityId = authentication.session.entity.id;

    /**
     * The history entry LEFT ends the membership. The replay removes it from
     * the active memberships.
     */
    const rejection = await changeMembershipHistory(
      data.citizenId,
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
                organizationId: data.organizationId,
                citizenId: data.citizenId,
              },
              citizen: ACTIVE_CITIZEN_WHERE,
            },
            select: {
              visibility: true,
            },
          });
        if (!membership) throw new RejectedChangeError(t("Common.notFound"));

        await transaction.organizationMembershipHistoryEntry.create({
          data: {
            organizationId: data.organizationId,
            citizenId: data.citizenId,
            type: OrganizationMembershipType.LEFT,
            visibility: membership.visibility,
            createdById: entityId,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedById: entityId,
          },
        });
      },
    );
    if (rejection !== null) return rejectConflict(rejection, formData);

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED,
        data: {
          organizationId: data.organizationId,
          citizenId: data.citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: "Erfolgreich entfernt",
    };
  },
);
