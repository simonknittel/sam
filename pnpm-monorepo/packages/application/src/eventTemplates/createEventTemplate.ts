import {
  AuditEventType,
  buildBriefingRootPageSeed,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireOwnCoverImage } from "../events/coverImage.js";
import { requireDescriptionFitsDiscord } from "../events/eventDescription.js";
import {
  eventDescriptionSchema,
  eventNameSchema,
} from "../events/eventInputSchemas.js";
import { withSpan } from "../withSpan.js";

/** A template has the bounds of an event, so a prefill never exceeds them */
export const createEventTemplateInputSchema = z.object({
  name: eventNameSchema,
  description: eventDescriptionSchema.optional(),
});

export type CreateEventTemplateInput = z.infer<
  typeof createEventTemplateInputSchema
>;

export interface CreateEventTemplateOptions {
  readonly coverImageId?: string;
}

export interface CreateEventTemplateOutput {
  readonly id: string;
  readonly name: string;
}

export const createEventTemplate = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateEventTemplateInput,
  { coverImageId }: CreateEventTemplateOptions = {},
): Promise<CreateEventTemplateOutput> =>
  withSpan(context, "createEventTemplate", async () => {
    requirePermission(actor, "event", "create");
    const citizenId = requireCitizen(actor).id;

    requireDescriptionFitsDiscord(context, input.description);

    if (coverImageId)
      await requireOwnCoverImage(context, citizenId, coverImageId);

    const template = await context.prisma.eventTemplate.create({
      data: {
        name: input.name,
        description: input.description || null,
        coverImageId: coverImageId ?? null,
        createdById: citizenId,
        updatedById: citizenId,
        ownedById: citizenId,
        wikiPages: {
          create: buildBriefingRootPageSeed(citizenId),
        },
      },
      select: { id: true, name: true },
    });

    await context.audit.create([
      {
        type: AuditEventType.EVENT_TEMPLATE_CREATED,
        data: { templateId: template.id, name: template.name },
        createdById: actor.userId,
      },
    ]);

    return template;
  });
