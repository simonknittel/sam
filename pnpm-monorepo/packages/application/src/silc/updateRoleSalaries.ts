import { AuditEventType, SILC_VALUE_MAXIMUM } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { SilcErrorMessage } from "./silcErrors.js";

/** An arbitrary limit that keeps the loops of one request bounded */
const MAXIMUM_ROLE_SALARIES = 250;

/** See the check `SilcRoleSalary_dayOfMonth_check` */
const MAXIMUM_SALARY_DAY_OF_MONTH = 31;

/** The three lists give the salaries: the items with one index are one salary */
export const updateRoleSalariesInputSchema = z
  .object({
    role_ids: z.array(idSchema).max(MAXIMUM_ROLE_SALARIES),
    values: z
      .array(z.int().min(1).max(SILC_VALUE_MAXIMUM))
      .max(MAXIMUM_ROLE_SALARIES),
    days_of_month: z
      .array(z.int().min(1).max(MAXIMUM_SALARY_DAY_OF_MONTH))
      .max(MAXIMUM_ROLE_SALARIES)
      .describe(
        "In a shorter month, a day after its end pays on its last day.",
      ),
  })
  .refine(
    (input) =>
      input.values.length === input.role_ids.length &&
      input.days_of_month.length === input.role_ids.length,
    { message: "The three lists must have the same length" },
  );

export type UpdateRoleSalariesInput = z.infer<
  typeof updateRoleSalariesInputSchema
>;

export interface UpdateRoleSalariesOutput {
  readonly salaries: {
    readonly role_id: string;
    readonly value: number;
    readonly day_of_month: number;
  }[];
}

export const updateRoleSalaries = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateRoleSalariesInput,
): Promise<UpdateRoleSalariesOutput> =>
  withSpan(context, "updateRoleSalaries", async () => {
    requirePermission(actor, "silcSetting", "update");
    requireCitizen(actor);

    const salaries = input.role_ids.flatMap((roleId, index) => {
      const value = input.values[index];
      const dayOfMonth = input.days_of_month[index];
      // The schema makes sure that the three lists have the same length
      if (value === undefined || dayOfMonth === undefined) return [];

      return [{ roleId, value, dayOfMonth }];
    });

    const salaryDays = new Set(
      salaries.map(({ roleId, dayOfMonth }) => `${roleId}:${dayOfMonth}`),
    );
    if (salaryDays.size !== salaries.length)
      throw new ValidationError(SilcErrorMessage.DuplicateSalaryDay);

    await context.prisma.$transaction([
      context.prisma.silcRoleSalary.deleteMany(),
      context.prisma.silcRoleSalary.createMany({ data: salaries }),
    ]);

    await context.audit.create([
      {
        type: AuditEventType.SALARY_CONFIG_UPDATED,
        data: { roleIds: input.role_ids },
        createdById: actor.userId,
      },
    ]);

    return {
      salaries: salaries.map(({ roleId, value, dayOfMonth }) => ({
        role_id: roleId,
        value,
        day_of_month: dayOfMonth,
      })),
    };
  });
