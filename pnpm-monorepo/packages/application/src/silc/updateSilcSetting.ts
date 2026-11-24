import { SilcSettingKey } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { auecConversionRateSchema } from "./auecConversionRate.js";

export const updateSilcSettingInputSchema = z.object({
  key: z.literal(SilcSettingKey.AUEC_CONVERSION_RATE),
  value: auecConversionRateSchema.describe("The aUEC value of one SILC."),
});

export type UpdateSilcSettingInput = z.infer<
  typeof updateSilcSettingInputSchema
>;

export interface UpdateSilcSettingOutput {
  readonly key: SilcSettingKey;
  readonly value: number;
}

export const updateSilcSetting = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateSilcSettingInput,
): Promise<UpdateSilcSettingOutput> =>
  withSpan(context, "updateSilcSetting", async () => {
    requirePermission(actor, "silcSetting", "update");
    const citizen = requireCitizen(actor);

    const value = String(input.value);
    await context.prisma.silcSetting.upsert({
      where: { key: input.key },
      update: { value, updatedById: citizen.id },
      create: { key: input.key, value, updatedById: citizen.id },
    });

    await context.audit.create([
      {
        type: AuditEventType.SILC_SETTING_UPDATED,
        data: { key: input.key, value },
        createdById: actor.userId,
      },
    ]);

    return { key: input.key, value: input.value };
  });
