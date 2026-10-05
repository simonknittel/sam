"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { changeMembershipHistory } from "../utils/changeMembershipHistory";

const ALREADY_CONFIRMED_ERROR = "Der Eintrag wurde bereits bestätigt.";

const schema = z.object({
  id: z.cuid(),
  organizationId: z.cuid(),
  citizenId: z.cuid(),
  confirmed: z.enum([
    ConfirmationStatus.CONFIRMED,
    ConfirmationStatus.FALSE_REPORT,
  ]),
});

export const confirmOrganizationMembership = createAuthenticatedAction(
  "confirmOrganizationMembership",
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
    if (!(await authentication.authorize("organizationMembership", "confirm")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const entityId = authentication.session.entity.id;

    /**
     * Set the new confirmation status. The replay adds or removes the active
     * membership. The result is the error of a conflict, or null.
     */
    const conflictError = await changeMembershipHistory(
      data.citizenId,
      async (transaction) => {
        const entry =
          await transaction.organizationMembershipHistoryEntry.findUnique({
            where: {
              id: data.id,
              organizationId: data.organizationId,
              citizenId: data.citizenId,
            },
            select: {
              id: true,
            },
          });
        if (!entry) return t("Common.notFound");

        /**
         * Only an entry without a confirmation changes. Thus a second
         * confirmation changes nothing and writes no second audit event.
         */
        const { count } =
          await transaction.organizationMembershipHistoryEntry.updateMany({
            where: {
              id: entry.id,
              confirmedAt: null,
            },
            data: {
              confirmed: data.confirmed,
              confirmedAt: new Date(),
              confirmedById: entityId,
            },
          });
        if (count === 0) return ALREADY_CONFIRMED_ERROR;

        return null;
      },
    );
    if (conflictError) return rejectConflict(conflictError, formData);

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
        data: {
          historyEntryId: data.id,
          citizenId: data.citizenId,
          confirmed: data.confirmed,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
