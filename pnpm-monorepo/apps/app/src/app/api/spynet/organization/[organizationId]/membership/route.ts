import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { changeMembershipHistory } from "@/modules/organizations/utils/changeMembershipHistory";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { NextResponse } from "next/server";
import * as z from "zod";

type Params = Promise<{
  organizationId: string;
}>;

const paramsSchema = z.object({ organizationId: z.cuid() });

const postBodySchema = z.object({
  citizenId: z.cuid(),
  type: z.enum([
    OrganizationMembershipType.MAIN,
    OrganizationMembershipType.AFFILIATE,
  ]),
  redacted: z.union([
    z.literal(OrganizationMembershipVisibility.REDACTED),
    z.literal(false),
  ]),
  confirmed: z.literal(ConfirmationStatus.CONFIRMED).optional(),
});

export async function POST(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/organization/[organizationId]/membership",
      "POST",
    );
    if (!authentication.session.entity) throw new Error("Forbidden");
    await authentication.authorizeApi("organizationMembership", "create");
    const entityId = authentication.session.entity.id;

    /**
     * Validate the request
     */
    const paramsData = paramsSchema.parse(await props.params);
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    const confirmable =
      data.confirmed === ConfirmationStatus.CONFIRMED &&
      (await authentication.authorize("organizationMembership", "confirm"));

    const visibility =
      data.redacted === OrganizationMembershipVisibility.REDACTED
        ? OrganizationMembershipVisibility.REDACTED
        : OrganizationMembershipVisibility.PUBLIC;

    /**
     * Create the history entry. The active memberships come from the
     * confirmed history entries, see changeMembershipHistory().
     */
    await changeMembershipHistory(data.citizenId, (transaction) =>
      transaction.organizationMembershipHistoryEntry.create({
        data: {
          organization: {
            connect: {
              id: paramsData.organizationId,
            },
          },
          citizen: {
            connect: {
              id: data.citizenId,
            },
          },
          type: data.type,
          visibility,
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
    );

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED,
        data: {
          organizationId: paramsData.organizationId,
          citizenId: data.citizenId,
          type: data.type,
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
