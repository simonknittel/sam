import { prisma } from "@/db";
import {
  OrganizationMembershipVisibility,
  type Organization,
} from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";

export const getActiveOrganizationMemberships = withTrace(
  "getActiveOrganizationMemberships",
  async (id: Organization["id"]) => {
    const authentication = await requireAuthentication();

    if (!(await authentication.authorize("organizationMembership", "read")))
      forbidden();

    const alsoVisibilityRedacted = await authentication.authorize(
      "organizationMembership",
      "read",
      [
        {
          key: "alsoVisibilityRedacted",
          value: true,
        },
      ],
    );

    const memberships = await prisma.activeOrganizationMembership.findMany({
      where: {
        organizationId: id,
        visibility: {
          in: alsoVisibilityRedacted
            ? [
                OrganizationMembershipVisibility.PUBLIC,
                OrganizationMembershipVisibility.REDACTED,
              ]
            : [OrganizationMembershipVisibility.PUBLIC],
        },
      },
      select: {
        citizen: {
          select: {
            id: true,
            handle: true,
            discordId: true,
          },
        },
      },
    });

    return memberships;
  },
);
