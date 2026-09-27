import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { changeMembershipHistory } from "@/modules/organizations/utils/changeMembershipHistory";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
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

const bodySchema = z.object({
  id: z.cuid(),
  confirmed: z.enum([
    ConfirmationStatus.CONFIRMED,
    ConfirmationStatus.FALSE_REPORT,
  ]),
});

export async function PATCH(request: Request, props: { params: Params }) {
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
    const paramsData = paramsSchema.parse(await props.params);
    const body: unknown = await request.json();
    const data = bodySchema.parse(body);

    /**
     * Set the new confirmation status. The replay adds or removes the active
     * membership.
     */
    await changeMembershipHistory(paramsData.citizenId, async (transaction) => {
      const entry =
        await transaction.organizationMembershipHistoryEntry.findUnique({
          where: {
            id: data.id,
            organizationId: paramsData.organizationId,
            citizenId: paramsData.citizenId,
          },
          select: {
            id: true,
          },
        });
      if (!entry) throw new Error("Not found");

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
      if (count === 0) throw new Error("Duplicate");
    });

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
        data: {
          historyEntryId: data.id,
          citizenId: paramsData.citizenId,
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
