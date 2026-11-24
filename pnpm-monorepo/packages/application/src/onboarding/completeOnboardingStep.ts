import {
  getOnboardingTaskRule,
  OnboardingStepKey,
  OnboardingTaskKey,
} from "@sam-monorepo/domain";
import * as z from "zod";
import {
  requireCitizen,
  satisfiesAnyPermissionString,
  type Actor,
} from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { OnboardingErrorMessage } from "./onboardingErrors.js";

export const completeOnboardingStepInputSchema = z.object({
  task_key: z.enum(OnboardingTaskKey),
  step_key: z.enum(OnboardingStepKey),
});

export type CompleteOnboardingStepInput = z.output<
  typeof completeOnboardingStepInputSchema
>;

export interface CompleteOnboardingStepOutput {
  readonly task_key: OnboardingTaskKey;
  readonly step_key: OnboardingStepKey;
}

/**
 * A replay updates the timestamp of the existing row, so the progress always
 * reflects the most recent pass through the tour. Writes no audit event: the
 * audit event of the task marks the end of the tour.
 */
export const completeOnboardingStep = async (
  context: ApplicationContext,
  actor: Actor,
  input: CompleteOnboardingStepInput,
): Promise<CompleteOnboardingStepOutput> => {
  const citizenId = requireCitizen(actor).id;

  const rule = getOnboardingTaskRule(input.task_key);

  const step = rule.steps.find(
    (stepCandidate) => stepCandidate.key === input.step_key,
  );
  if (!step) throw new NotFoundError(OnboardingErrorMessage.StepNotFound);

  if (
    !satisfiesAnyPermissionString(actor, rule.requiredPermissionStrings) ||
    !satisfiesAnyPermissionString(actor, step.requiredPermissionStrings)
  )
    throw new ForbiddenError(OnboardingErrorMessage.StepNotOpen);

  const completedAt = context.now();

  await context.prisma.onboardingStepProgress.upsert({
    where: {
      citizenId_taskKey_stepKey: {
        citizenId,
        taskKey: input.task_key,
        stepKey: input.step_key,
      },
    },
    update: { completedAt },
    create: {
      citizenId,
      taskKey: input.task_key,
      stepKey: input.step_key,
      completedAt,
    },
  });

  return { task_key: input.task_key, step_key: input.step_key };
};
