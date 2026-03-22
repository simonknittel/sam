import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

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

    /**
     * Validate the request
     */
    const paramsData = paramsSchema.parse(await props.params);
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Do the thing
     */
    if (
      data.confirmed === ConfirmationStatus.CONFIRMED &&
      (await authentication.authorize("organizationMembership", "confirm"))
    ) {
      await prisma.$transaction([
        prisma.activeOrganizationMembership.create({
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
            visibility:
              data.redacted || OrganizationMembershipVisibility.PUBLIC,
          },
        }),

        prisma.organizationMembershipHistoryEntry.create({
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
            visibility:
              data.redacted || OrganizationMembershipVisibility.PUBLIC,
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
        }),
      ]);
    } else {
      const visibility =
        data.redacted === OrganizationMembershipVisibility.REDACTED
          ? OrganizationMembershipVisibility.REDACTED
          : OrganizationMembershipVisibility.PUBLIC;

      await prisma.organizationMembershipHistoryEntry.create({
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
        },
      });
    }

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
