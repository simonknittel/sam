import { authenticateApi } from "@/auth/server";
import apiErrorHandler from "@/common/utils/apiErrorHandler";
import { prisma } from "@/db";
import { updateActiveMembership } from "@/organizations/utils/updateActiveMembership";
import { ConfirmationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  id: z.string().cuid(),
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
    const authentication = await authenticateApi(
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
