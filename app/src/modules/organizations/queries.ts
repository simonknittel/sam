import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  OrganizationMembershipVisibility,
  type Organization,
} from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getOrganizations = cache(
  withTrace("getOrganizations", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("organization", "read"))) forbidden();

    return prisma.organization.findMany();
  }),
);

export const getOrganizationById = cache(
  withTrace("getOrganizationById", async (id: Organization["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("organization", "read"))) forbidden();

    return prisma.organization.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        spectrumId: true,
        name: true,
        logo: true,
      },
    });
  }),
);

export const getOrganizationBySpectrumId = withTrace(
  "getOrganizationBySpectrumId",
  async (spectrumId: Organization["spectrumId"]) => {
    return prisma.organization.findFirst({
      where: {
        spectrumId,
      },
    });
  },
);

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
