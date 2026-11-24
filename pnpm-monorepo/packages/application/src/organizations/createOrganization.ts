import { ConfirmationStatus } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowUniqueConstraintFailed, ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { OrganizationErrorMessage } from "./organizationErrors.js";

export const createOrganizationInputSchema = z.object({
  spectrum_id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export type CreateOrganizationInput = z.infer<
  typeof createOrganizationInputSchema
>;

export interface CreateOrganizationOutput {
  readonly id: string;
  readonly spectrum_id: string;
  readonly name: string;
}

export interface CreateOrganizationOptions {
  /**
   * The path of the logo on the website of Roberts Space Industries. An error
   * or no logo creates the organization without a logo.
   */
  readonly findLogo?: (spectrumId: string) => Promise<string | undefined>;
}

export const createOrganization = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateOrganizationInput,
  { findLogo }: CreateOrganizationOptions = {},
): Promise<CreateOrganizationOutput> =>
  withSpan(context, "createOrganization", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "organization", "create");

    const existingOrganization = await context.prisma.organization.findFirst({
      where: { spectrumId: input.spectrum_id },
      select: { id: true },
    });
    if (existingOrganization)
      throw new ValidationError(OrganizationErrorMessage.SpectrumIdTaken);

    let logo: string | undefined;
    try {
      logo = await findLogo?.(input.spectrum_id);
    } catch (error) {
      context.log.error("Failed to scrape organization logo", {
        spectrumId: input.spectrum_id,
        error,
      });
    }

    /** A different user can create the same organization at the same time */
    const organization = await rethrowUniqueConstraintFailed(
      () =>
        context.prisma.organization.create({
          data: {
            spectrumId: input.spectrum_id,
            name: input.name,
            logo,
            createdById: citizen.id,
            attributeHistoryEntries: {
              create: {
                createdById: citizen.id,
                attributeKey: "name",
                newValue: input.name,
                confirmed: ConfirmationStatus.CONFIRMED,
                confirmedAt: context.now(),
                confirmedById: citizen.id,
              },
            },
          },
          select: { id: true, spectrumId: true, name: true },
        }),
      OrganizationErrorMessage.SpectrumIdTaken,
    );

    await context.audit.create([
      {
        type: AuditEventType.ORGANIZATION_CREATED,
        data: {
          organizationId: organization.id,
          spectrumId: organization.spectrumId,
          name: organization.name,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      id: organization.id,
      spectrum_id: organization.spectrumId,
      name: organization.name,
    };
  });
