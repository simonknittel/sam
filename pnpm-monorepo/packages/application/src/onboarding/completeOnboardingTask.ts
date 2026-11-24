import { OnboardingTaskCompletionMethod } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  getOnboardingTaskRule,
  OnboardingTaskKey,
} from "@sam-monorepo/domain";
import * as z from "zod";
import {
  requireCitizen,
  satisfiesAnyPermissionString,
  type Actor,
} from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { OnboardingErrorMessage } from "./onboardingErrors.js";

export const completeOnboardingTaskInputSchema = z.object({
  task_key: z.enum(OnboardingTaskKey),
  completion_method: z.enum(OnboardingTaskCompletionMethod),
});

export type CompleteOnboardingTaskInput = z.output<
  typeof completeOnboardingTaskInputSchema
>;

export interface CompleteOnboardingTaskOutput {
  readonly task_key: OnboardingTaskKey;
  readonly completion_method: OnboardingTaskCompletionMethod;
}

/** A replay updates the existing row, like in `completeOnboardingStep()` */
export const completeOnboardingTask = async (
  context: ApplicationContext,
  actor: Actor,
  input: CompleteOnboardingTaskInput,
): Promise<CompleteOnboardingTaskOutput> => {
  const citizenId = requireCitizen(actor).id;

  const rule = getOnboardingTaskRule(input.task_key);

  if (!satisfiesAnyPermissionString(actor, rule.requiredPermissionStrings))
    throw new ForbiddenError(OnboardingErrorMessage.TaskNotOpen);

  const completedAt = context.now();

  await context.prisma.onboardingTaskProgress.upsert({
    where: { citizenId_taskKey: { citizenId, taskKey: input.task_key } },
    update: { completedAt, completionMethod: input.completion_method },
    create: {
      citizenId,
      taskKey: input.task_key,
      completedAt,
      completionMethod: input.completion_method,
    },
  });

  await context.audit.create([
    {
      type: AuditEventType.ONBOARDING_TASK_COMPLETED,
      data: {
        citizenId,
        taskKey: input.task_key,
        completionMethod: input.completion_method,
      },
      createdById: actor.userId,
    },
  ]);

  return {
    task_key: input.task_key,
    completion_method: input.completion_method,
  };
};
