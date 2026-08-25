"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { OnboardingTaskCompletionMethod } from "@sam-monorepo/database/client";
import { z } from "zod";
import { getOnboardingState } from "../utils/queries/getOnboardingState";

const schema = z.object({});

export const skipAllOnboardingTasks = createAuthenticatedAction(
  "skipAllOnboardingTasks",
  schema,
  async (formData, authentication, _data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * The state already contains only the tasks the citizen is allowed to
     * see, so no further permission check is necessary here.
     */
    const state = await getOnboardingState();
    if (!state)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const completedTaskKeys = new Set(state.completedTaskKeys);
    const openTaskKeys = state.eligibleTasks
      .map((task) => task.key)
      .filter((taskKey) => !completedTaskKeys.has(taskKey));

    if (openTaskKeys.length > 0) {
      const completedAt = new Date();

      await prisma.onboardingTaskProgress.createMany({
        data: openTaskKeys.map((taskKey) => ({
          citizenId,
          taskKey,
          completedAt,
          completionMethod: OnboardingTaskCompletionMethod.SKIPPED,
        })),
        skipDuplicates: true,
      });

      await createAuditEvents(
        openTaskKeys.map((taskKey) => ({
          type: AuditEventType.ONBOARDING_TASK_COMPLETED,
          data: {
            citizenId,
            taskKey,
            completionMethod: OnboardingTaskCompletionMethod.SKIPPED,
          },
          createdById: authentication.session.user.id,
        })),
      );
    }

    /**
     * Deliberately no revalidation, see `completeOnboardingTask`.
     */
    return { success: "Alle Aufgaben wurden als erledigt markiert." };
  },
);
