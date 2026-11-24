"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  completeOnboardingStepInputSchema,
  completeOnboardingStep as completeOnboardingStepUseCase,
} from "@sam-monorepo/application";

export const completeOnboardingStep = createUseCaseAction({
  name: "completeOnboardingStep",
  schema: completeOnboardingStepInputSchema,
  useCase: completeOnboardingStepUseCase,
  parseFormData: (formData) => ({
    task_key: formData.get("taskKey"),
    step_key: formData.get("stepKey"),
  }),
  /**
   * No `refresh()` on success, see `completeOnboardingTask`. A not-found
   * answer refreshes (the error mapper): only a crafted request names a task
   * or a step that does not exist.
   */
  refresh: ActionRefresh.Never,
  success: () => "Fortschritt gespeichert.",
});
