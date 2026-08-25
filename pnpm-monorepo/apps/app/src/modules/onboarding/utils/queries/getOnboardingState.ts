import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { satisfiesAnyPermissionString } from "@/modules/auth/utils/satisfiesAnyPermissionString";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { ONBOARDING_TASKS } from "../config";
import {
  encodeOnboardingStepProgressKey,
  type EligibleOnboardingTask,
  type OnboardingState,
} from "../types";

/**
 * Resolves the onboarding tasks the citizen is allowed to see, together with
 * their progress. Returns null for sessions without a citizen — those never
 * see the onboarding feature.
 */
export const getOnboardingState = cache(
  withTrace("getOnboardingState", async (): Promise<OnboardingState | null> => {
    const authentication = await authenticate();
    if (!authentication || !authentication.session.entity) return null;
    const citizenId = authentication.session.entity.id;

    const eligibleTasks = (
      await Promise.all(
        ONBOARDING_TASKS.map(
          async (task): Promise<EligibleOnboardingTask | null> => {
            if (
              !(await satisfiesAnyPermissionString(
                authentication,
                task.requiredPermissionStrings,
              ))
            )
              return null;

            const stepKeys = (
              await Promise.all(
                task.steps.map(async (step) =>
                  (await satisfiesAnyPermissionString(
                    authentication,
                    step.requiredPermissionStrings,
                  ))
                    ? step.key
                    : null,
                ),
              )
            ).filter((stepKey) => stepKey !== null);

            if (stepKeys.length === 0) return null;

            return { key: task.key, stepKeys };
          },
        ),
      )
    ).filter((task) => task !== null);

    const [taskProgress, stepProgress] = await Promise.all([
      prisma.onboardingTaskProgress.findMany({
        where: { citizenId },
        select: { taskKey: true },
      }),
      prisma.onboardingStepProgress.findMany({
        where: { citizenId },
        select: { taskKey: true, stepKey: true },
      }),
    ]);

    return {
      eligibleTasks,
      completedTaskKeys: taskProgress.map((progress) => progress.taskKey),
      completedStepProgressKeys: stepProgress.map((progress) =>
        encodeOnboardingStepProgressKey(progress.taskKey, progress.stepKey),
      ),
    };
  }),
);
