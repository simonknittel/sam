import {
  AuditEventType,
  eventContainerColumns,
  toTemplateContainer,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { eventNameSchema } from "../events/eventInputSchemas.js";
import { idSchema } from "../pagination.js";
import { COPYABLE_UPLOAD_SELECT } from "../uploads/uploadCopy.js";
import { withSpan } from "../withSpan.js";
import { requireReadableEventTemplate } from "./eventTemplateAccess.js";
import { createEventTemplateCopy } from "./eventTemplateCopy.js";

export const duplicateEventTemplateInputSchema = z.object({
  source_template_id: idSchema,
  name: eventNameSchema,
});

export type DuplicateEventTemplateInput = z.infer<
  typeof duplicateEventTemplateInputSchema
>;

export interface DuplicateEventTemplateOutput {
  readonly id: string;
  readonly name: string;
}

/**
 * Copies a template the actor may read into a personal template of their
 * own: fields, visibility prefill, participation switch, cover, lineup and
 * briefing carry over, the role shares deliberately do not. Handing a copy
 * out again is the duplicator's decision, not an inherited one.
 */
export const duplicateEventTemplate = (
  context: ApplicationContext,
  actor: Actor,
  input: DuplicateEventTemplateInput,
): Promise<DuplicateEventTemplateOutput> =>
  withSpan(context, "duplicateEventTemplate", async () => {
    /**
     * Authorize the request. Reading a template is enough to duplicate it —
     * the copy is a new personal template, not a change to the source.
     */
    const citizenId = requireCitizen(actor).id;

    const { template: source } = await requireReadableEventTemplate(
      context,
      actor,
      input.source_template_id,
      {
        select: {
          name: true,
          description: true,
          coverImage: { select: COPYABLE_UPLOAD_SELECT },
          visibility: true,
          visibilityRoles: { select: { roleId: true } },
          participationEnabled: true,
          discordPublishTarget: true,
          discordPublishChannelId: true,
          discordPublishLocation: true,
        },
      },
    );

    /**
     * A source whose root page is trashed gives a duplicate without a
     * briefing: the copy has no root fallback (a known defect).
     */
    const { template, positionCount, pageCount } =
      await createEventTemplateCopy(
        context,
        citizenId,
        {
          columns: eventContainerColumns(toTemplateContainer(source.id)),
          coverImage: source.coverImage,
          seedsMissingBriefingRoot: false,
        },
        {
          name: input.name,
          description: source.description,
          visibility: source.visibility,
          visibilityRoleIds: source.visibilityRoles.map(
            (visibilityRole) => visibilityRole.roleId,
          ),
          participationEnabled: source.participationEnabled,
          discordPublishTarget: source.discordPublishTarget,
          discordPublishChannelId: source.discordPublishChannelId,
          discordPublishLocation: source.discordPublishLocation,
        },
      );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_TEMPLATE_DUPLICATED,
        data: {
          templateId: template.id,
          name: template.name,
          sourceTemplateId: source.id,
          sourceName: source.name,
          positionCount,
          pageCount,
        },
        createdById: actor.userId,
      },
    ]);

    return template;
  });
