import {
  AuditEventType,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  PROFIT_CYCLE_TITLE_MAXIMUM_LENGTH,
  toDateColumnValue,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { ProfitDistributionErrorMessage } from "./profitDistributionErrors.js";

export const createProfitDistributionCycleInputSchema = z.object({
  title: z.string().trim().max(PROFIT_CYCLE_TITLE_MAXIMUM_LENGTH),
  /**
   * A date ("YYYY-MM-DD") gives the midnight UTC of the day, the value of a
   * date column. Not `dateTimeInputSchema`: a wall time of the organization
   * would move the planned end by the offset of the time zone.
   */
  collection_ends_at: z.coerce
    .date()
    .describe("The planned end of the collection phase, a date."),
});

export type CreateProfitDistributionCycleInput = z.infer<
  typeof createProfitDistributionCycleInputSchema
>;

export interface CreateProfitDistributionCycleOutput {
  readonly id: string;
  readonly title: string;
  readonly collection_ends_at: Date;
}

export const createProfitDistributionCycle = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateProfitDistributionCycleInput,
): Promise<CreateProfitDistributionCycleOutput> =>
  withSpan(context, "createProfitDistributionCycle", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "profitDistributionCycle", "create");

    const today = toDateColumnValue(
      getLocalDate(context.now(), ORGANIZATION_TIMEZONE),
    );
    if (input.collection_ends_at < today)
      throw new ValidationError(
        ProfitDistributionErrorMessage.CollectionEndInPast,
      );

    const cycle = await context.prisma.profitDistributionCycle.create({
      data: {
        title: input.title,
        collectionEndsAt: input.collection_ends_at,
        createdById: citizen.id,
      },
      select: { id: true, title: true, collectionEndsAt: true },
    });

    await context.audit.create([
      {
        type: AuditEventType.PROFIT_CYCLE_CREATED,
        data: {
          cycleId: cycle.id,
          title: cycle.title,
          // The system log is immutable, thus the old key keeps the planned end
          collectionEndedAt: cycle.collectionEndsAt,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      id: cycle.id,
      title: cycle.title,
      collection_ends_at: cycle.collectionEndsAt,
    };
  });
