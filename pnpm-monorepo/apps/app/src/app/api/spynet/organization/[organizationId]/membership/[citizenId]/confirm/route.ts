import { prisma } from "@/db";
import { ConfirmationStatus } from "@/generated/prisma/client";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { updateActiveMembership } from "@/modules/organizations/utils/updateActiveMembership";
import { NextResponse } from "next/server";
import { z } from "zod";

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
      });
    if (!membership) throw new Error("Not found");

    /**
     * Set new confirmation status
     */
    await prisma.organizationMembershipHistoryEntry.update({
      where: {
        id: membership.id,
      },
      data: {
        confirmed: data.confirmed,
        confirmedAt: new Date(),
        confirmedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

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
     * Update ActiveOrganizationMembership
     */
    await updateActiveMembership(membership.citizenId);

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
