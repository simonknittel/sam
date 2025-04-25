import { authenticateApi } from "@/auth/server";
import apiErrorHandler from "@/common/utils/apiErrorHandler";
import { prisma } from "@/db";
import { updateActiveMembership } from "@/organizations/utils/updateActiveMembership";
import { ConfirmationStatus, OrganizationMembershipType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = Promise<{
  organizationId: string;
  citizenId: string;
}>;

const paramsSchema = z.object({
  organizationId: z.string().cuid(),
  citizenId: z.string().cuid(),
});

export async function DELETE(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await authenticateApi(
      "/api/spynet/organization/[organizationId]/membership/[citizenId]",
      "DELETE",
    );
    if (!authentication.session.entity) throw new Error("Forbidden");
    await authentication.authorizeApi("organizationMembership", "delete");

    /**
     * Validate the request
     */
    const paramsData = paramsSchema.parse(await props.params);

    /**
     * Do the thing
     */
    const membership = await prisma.activeOrganizationMembership.findUnique({
      where: {
        organizationId_citizenId: {
          organizationId: paramsData.organizationId,
          citizenId: paramsData.citizenId,
        },
      },
    });
    if (!membership) throw new Error("Not Found");

    await prisma.organizationMembershipHistoryEntry.create({
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
            /**
             * We can use `!` here since at this point it's guaranteed that the user has an entity attached.
             * This is because permissions are attached to the entity and above we check for permissions. If the
             * user wouldn't have an entity, they also wouldn't have permissions and the request would have been
             * rejected above.
             * The only exception is with the `adminEnabled` cookie.
             */
            id: authentication.session.entity.id,
          },
        },
        confirmed: ConfirmationStatus.CONFIRMED,
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
