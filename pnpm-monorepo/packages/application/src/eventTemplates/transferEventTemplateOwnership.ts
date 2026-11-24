import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireShareableEventTemplate } from "./eventTemplateAccess.js";
import { EventTemplateErrorMessage } from "./eventTemplateErrors.js";

export const transferEventTemplateOwnershipInputSchema = z.object({
  template_id: idSchema,
  new_owner_id: idSchema,
});

export type TransferEventTemplateOwnershipInput = z.infer<
  typeof transferEventTemplateOwnershipInputSchema
>;

export interface TransferEventTemplateOwnershipOutput {
  readonly template_id: string;
  readonly owner_id: string;
}

/**
 * The role shares stay. The previous owner keeps nothing beyond what those
 * shares grant them; the UI says so before confirming.
 */
export const transferEventTemplateOwnership = (
  context: ApplicationContext,
  actor: Actor,
  input: TransferEventTemplateOwnershipInput,
): Promise<TransferEventTemplateOwnershipOutput> =>
  withSpan(context, "transferEventTemplateOwnership", async () => {
    const { template } = await requireShareableEventTemplate(
      context,
      actor,
      input.template_id,
      { select: { name: true } },
    );

    /** Possibly a different tab or user transferred the template before */
    if (input.new_owner_id === template.ownedById)
      return { template_id: template.id, owner_id: input.new_owner_id };

    /**
     * Any citizen may own a template — holding `event;create` is not
     * required, mirroring the wiki's tolerance for an owner who cannot reach
     * their own page. A deleted citizen is accepted too (a known defect).
     */
    const newOwner = await context.prisma.citizen.findUnique({
      where: { id: input.new_owner_id },
      select: { id: true },
    });
    if (!newOwner)
      throw new ValidationError(EventTemplateErrorMessage.OwnerNotFound);

    /** The condition on `deletedAt`: see `updateEventTemplate()` */
    await rethrowRecordNotFound(
      () =>
        context.prisma.eventTemplate.update({
          where: { id: template.id, deletedAt: null },
          data: {
            ownedById: newOwner.id,
            updatedById: actor.citizen?.id ?? null,
          },
          select: { id: true },
        }),
      EventTemplateErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_TEMPLATE_OWNERSHIP_TRANSFERRED,
        data: {
          templateId: template.id,
          name: template.name,
          previousOwnerId: template.ownedById,
          newOwnerId: newOwner.id,
        },
        createdById: actor.userId,
      },
    ]);

    return { template_id: template.id, owner_id: newOwner.id };
  });
