import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { changeMembershipHistory } from "@/modules/organizations/utils/changeMembershipHistory";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import { NextResponse } from "next/server";
import * as z from "zod";

const bodySchema = z.object({
  id: z.cuid(),
  confirmed: z.enum([
    ConfirmationStatus.CONFIRMED,
    ConfirmationStatus.FALSE_REPORT,
  ]),
});

export async function PATCH(request: Request) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/organization/[organizationId]/membership/[citizenId]/confirm",
      "PATCH",
    );
    if (!authentication.session.entity) throw new Error("Forbidden");
    await authentication.authorizeApi("organizationMembership", "confirm");
    const entityId = authentication.session.entity.id;

    /**
     * Validate the request
     */
    const body: unknown = await request.json();
    const data = bodySchema.parse(body);

    const membership =
      await prisma.organizationMembershipHistoryEntry.findUnique({
        where: {
          id: data.id,
        },
        select: {
          id: true,
          citizenId: true,
        },
      });
    if (!membership) throw new Error("Not found");

    /**
     * Set the new confirmation status. The replay adds or removes the active
     * membership.
     */
    await changeMembershipHistory(membership.citizenId, (transaction) =>
      transaction.organizationMembershipHistoryEntry.update({
        where: {
          id: membership.id,
        },
        data: {
          confirmed: data.confirmed,
          confirmedAt: new Date(),
          confirmedBy: {
            connect: {
              id: entityId,
            },
          },
        },
      }),
    );

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
        data: {
          historyEntryId: membership.id,
          citizenId: membership.citizenId,
          confirmed: data.confirmed,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return NextResponse.json({});
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
