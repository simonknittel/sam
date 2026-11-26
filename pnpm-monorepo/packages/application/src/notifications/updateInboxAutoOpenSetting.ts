import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export const updateInboxAutoOpenSettingInputSchema = z.object({
  enabled: z
    .boolean()
    .describe(
      "Whether the inbox opens by itself on a page load with unread notifications and when a new notification arrives",
    ),
});

export type UpdateInboxAutoOpenSettingInput = z.output<
  typeof updateInboxAutoOpenSettingInputSchema
>;

export interface UpdateInboxAutoOpenSettingOutput {
  readonly enabled: boolean;
  /** False when the setting already had the value */
  readonly changed: boolean;
}

export const updateInboxAutoOpenSetting = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateInboxAutoOpenSettingInput,
): Promise<UpdateInboxAutoOpenSettingOutput> =>
  withSpan(context, "updateInboxAutoOpenSetting", async () => {
    const citizenId = requireCitizen(actor).id;

    // The condition on the old value makes two overlapping saves write one
    // audit event only
    const { count } = await context.prisma.citizen.updateMany({
      where: input.enabled
        ? { id: citizenId, inboxAutoOpenDisabledAt: { not: null } }
        : { id: citizenId, inboxAutoOpenDisabledAt: null },
      data: {
        inboxAutoOpenDisabledAt: input.enabled ? null : context.now(),
      },
    });
    const changed = count > 0;

    if (changed)
      await context.audit.create([
        {
          type: AuditEventType.INBOX_AUTO_OPEN_SETTING_UPDATED,
          data: { citizenId, enabled: input.enabled },
          createdById: actor.userId,
        },
      ]);

    return { enabled: input.enabled, changed };
  });
