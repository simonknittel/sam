"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { changeMembershipHistory } from "../utils/changeMembershipHistory";

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
      (transaction) =>
        transaction.organizationMembershipHistoryEntry.create({
          data: {
            organization: {
              connect: {
                id: data.organizationId,
              },
            },
            citizen: {
              connect: {
                id: data.citizenId,
              },
            },
            type: data.type,
            visibility: data.visibility,
            createdBy: {
              connect: {
                id: entityId,
              },
            },
            ...(confirmable
              ? {
                  confirmed: ConfirmationStatus.CONFIRMED,
                  confirmedAt: new Date(),
                  confirmedBy: {
                    connect: {
                      id: entityId,
                    },
                  },
                }
              : {}),
          },
        }),
    )
      .then(() => true)
      .catch((error: unknown) => {
        /** The entered ID belongs to no organization or no citizen */
        if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) return false;
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
