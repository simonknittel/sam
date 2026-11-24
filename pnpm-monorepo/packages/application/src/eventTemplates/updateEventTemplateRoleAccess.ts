import { EventTemplateAccessType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_VISIBILITY_ROLES,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireShareableEventTemplate } from "./eventTemplateAccess.js";
import { EventTemplateErrorMessage } from "./eventTemplateErrors.js";

/** A template shares with at most as many roles as an event is visible to */
const roleIdsSchema = z.array(idSchema).max(EVENT_MAX_VISIBILITY_ROLES);

export const updateEventTemplateRoleAccessInputSchema = z.object({
  template_id: idSchema,
  read_role_ids: roleIdsSchema,
  edit_role_ids: roleIdsSchema,
});

export type UpdateEventTemplateRoleAccessInput = z.infer<
  typeof updateEventTemplateRoleAccessInputSchema
>;

export interface UpdateEventTemplateRoleAccessOutput {
  readonly template_id: string;
  /** The roles that read and use the template, without the edit roles */
  readonly read_role_ids: string[];
  readonly edit_role_ids: string[];
}

export const updateEventTemplateRoleAccess = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateEventTemplateRoleAccessInput,
): Promise<UpdateEventTemplateRoleAccessOutput> =>
  withSpan(context, "updateEventTemplateRoleAccess", async () => {
    const { template } = await requireShareableEventTemplate(
      context,
      actor,
      input.template_id,
    );

    /**
     * EDIT implies READ, so a role listed in both tiers gets exactly one row
     * with the higher one.
     */
    const editRoleIds = [...new Set(input.edit_role_ids)];
    const editRoleIdSet = new Set(editRoleIds);
    const readRoleIds = [
      ...new Set(
        input.read_role_ids.filter((roleId) => !editRoleIdSet.has(roleId)),
      ),
    ];

    const roleIds = [...readRoleIds, ...editRoleIds];
    const existingRoleCount = await context.prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (existingRoleCount !== roleIds.length)
      throw new ValidationError(EventTemplateErrorMessage.UnknownRole);

    /**
     * The error of the condition on `deletedAt` (see `updateEventTemplate()`)
     * rolls back the whole batch
     */
    await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction([
          context.prisma.eventTemplateRoleAccess.deleteMany({
            where: { templateId: template.id },
          }),

          context.prisma.eventTemplateRoleAccess.createMany({
            data: [
              ...readRoleIds.map((roleId) => ({
                templateId: template.id,
                roleId,
                type: EventTemplateAccessType.READ,
              })),
              ...editRoleIds.map((roleId) => ({
                templateId: template.id,
                roleId,
                type: EventTemplateAccessType.EDIT,
              })),
            ],
          }),

          context.prisma.eventTemplate.update({
            where: { id: template.id, deletedAt: null },
            data: { updatedById: actor.citizen?.id ?? null },
            select: { id: true },
          }),
        ]),
      EventTemplateErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_TEMPLATE_ROLE_ACCESS_UPDATED,
        data: {
          templateId: template.id,
          readRoleIds,
          editRoleIds,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      template_id: template.id,
      read_role_ids: readRoleIds,
      edit_role_ids: editRoleIds,
    };
  });
