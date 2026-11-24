import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireManageableEventTemplate } from "./eventTemplateAccess.js";

export const restoreEventTemplateInputSchema = z.object({
  template_id: idSchema,
});

export type RestoreEventTemplateInput = z.infer<
  typeof restoreEventTemplateInputSchema
>;

export interface RestoreEventTemplateOutput {
  readonly template_id: string;
}

/**
 * Unlike a career flow, a template holds no unique slug, so nothing can block
 * the restore
 */
export const restoreEventTemplate = (
  context: ApplicationContext,
  actor: Actor,
  input: RestoreEventTemplateInput,
): Promise<RestoreEventTemplateOutput> =>
  withSpan(context, "restoreEventTemplate", async () => {
    const { template } = await requireManageableEventTemplate(
      context,
      actor,
      input.template_id,
      { select: { name: true } },
    );

    /**
     * The condition on `deletedAt` lets only one of two parallel requests
     * restore the template. A template that a different tab or user restored
     * before is no error: the result is the same.
     */
    const { count } = await context.prisma.eventTemplate.updateMany({
      where: { id: template.id, deletedAt: { not: null } },
      data: { deletedAt: null, deletedById: null },
    });

    if (count > 0)
      await context.audit.create([
        {
          type: AuditEventType.EVENT_TEMPLATE_RESTORED,
          data: { templateId: template.id, name: template.name },
          createdById: actor.userId,
        },
      ]);

    return { template_id: template.id };
  });
