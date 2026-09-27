import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { changeMembershipHistory } from "@/modules/organizations/utils/changeMembershipHistory";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
} from "@sam-monorepo/database/client";
import { NextResponse } from "next/server";
import * as z from "zod";

type Params = Promise<{
  organizationId: string;
  citizenId: string;
}>;

const paramsSchema = z.object({
  organizationId: z.cuid(),
  citizenId: z.cuid(),
});

export async function DELETE(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/organization/[organizationId]/membership/[citizenId]",
      "DELETE",
    );
    if (!authentication.session.entity) throw new Error("Forbidden");
    await authentication.authorizeApi("organizationMembership", "delete");
    const entityId = authentication.session.entity.id;

    /**
     * Validate the request
     */
    const paramsData = paramsSchema.parse(await props.params);

    /**
     * The history entry LEFT ends the membership. The replay removes it from
     * the active memberships.
     */
    await changeMembershipHistory(paramsData.citizenId, async (transaction) => {
      const membership =
        await transaction.activeOrganizationMembership.findUnique({
          where: {
            organizationId_citizenId: {
              organizationId: paramsData.organizationId,
              citizenId: paramsData.citizenId,
            },
          },
          select: {
            visibility: true,
          },
        });
      if (!membership) throw new Error("Not found");

      await transaction.organizationMembershipHistoryEntry.create({
        data: {
          organization: {
            connect: {
              id: paramsData.organizationId,
            },
          },
          citizen: {
            connect: {
              id: paramsData.citizenId,
            },
          },
          type: OrganizationMembershipType.LEFT,
          visibility: membership.visibility,
          createdBy: {
            connect: {
              id: entityId,
            },
          },
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedBy: {
            connect: {
              id: entityId,
            },
          },
        },
      });
    });

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED,
        data: {
          organizationId: paramsData.organizationId,
          citizenId: paramsData.citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond
     */
    return NextResponse.json({});
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
