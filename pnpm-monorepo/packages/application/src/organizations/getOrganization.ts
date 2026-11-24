import { getOrganizationLogoUrl } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { OrganizationErrorMessage } from "./organizationErrors.js";
import {
  listActiveOrganizationMemberships,
  type OrganizationMemberOutput,
} from "./organizationMemberships.js";

export const getOrganizationInputSchema = z.object({
  organization_id: idSchema,
});

export interface GetOrganizationOutput {
  readonly id: string;
  readonly name: string;
  readonly spectrum_id: string;
  readonly logo_url: string | null;
  /** Empty without `organizationMembership;read` */
  readonly memberships: OrganizationMemberOutput[];
}

export const getOrganization = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.output<typeof getOrganizationInputSchema>,
): Promise<GetOrganizationOutput> => {
  requirePermission(actor, "organization", "read");

  return withSpan(context, "getOrganization", async () => {
    const [organization, memberships] = await Promise.all([
      context.prisma.organization.findUnique({
        where: { id: input.organization_id },
        select: { id: true, name: true, spectrumId: true, logo: true },
      }),
      actor.authorize("organizationMembership", "read")
        ? listActiveOrganizationMemberships(
            context,
            actor,
            input.organization_id,
          )
        : [],
    ]);
    if (!organization)
      throw new NotFoundError(OrganizationErrorMessage.OrganizationNotFound);

    return {
      id: organization.id,
      name: organization.name,
      spectrum_id: organization.spectrumId,
      logo_url: getOrganizationLogoUrl(organization.logo),
      memberships,
    };
  });
};
