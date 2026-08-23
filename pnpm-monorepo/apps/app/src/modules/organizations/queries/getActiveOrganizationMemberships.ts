import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  OrganizationMembershipVisibility,
  type Organization,
} from "@sam-monorepo/database/client";
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
          },
        },
      },
    });

    return memberships;
  },
);
