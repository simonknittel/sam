import { OnboardingTaskCompletionMethod } from "@sam-monorepo/database/browser";
import { AuditEventType, type OnboardingTaskKey } from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { loadOnboardingState } from "./findOnboardingState.js";

export interface SkipAllOnboardingTasksOutput {
  readonly skipped_task_keys: OnboardingTaskKey[];
}

/**
 * The tasks that the actor is allowed to see are the only ones that count, thus
 * no further permission check is necessary
 */
export const skipAllOnboardingTasks = (
  context: ApplicationContext,
  actor: Actor,
): Promise<SkipAllOnboardingTasksOutput> =>
  withSpan(context, "skipAllOnboardingTasks", async () => {
    const citizenId = requireCitizen(actor).id;

    const state = await loadOnboardingState(context, actor, citizenId);

    const completedTaskKeys = new Set(state.completedTaskKeys);
    const openTaskKeys = state.eligibleTasks
      .map((task) => task.key)
      .filter((taskKey) => !completedTaskKeys.has(taskKey));

    if (openTaskKeys.length > 0) {
      const completedAt = context.now();

      await context.prisma.onboardingTaskProgress.createMany({
        data: openTaskKeys.map((taskKey) => ({
          citizenId,
          taskKey,
          completedAt,
          completionMethod: OnboardingTaskCompletionMethod.SKIPPED,
        })),
        skipDuplicates: true,
      });

      await context.audit.create(
        openTaskKeys.map((taskKey) => ({
          type: AuditEventType.ONBOARDING_TASK_COMPLETED,
          data: {
            citizenId,
            taskKey,
            completionMethod: OnboardingTaskCompletionMethod.SKIPPED,
          },
          createdById: actor.userId,
        })),
      );
    }

    return { skipped_task_keys: openTaskKeys };
  });
