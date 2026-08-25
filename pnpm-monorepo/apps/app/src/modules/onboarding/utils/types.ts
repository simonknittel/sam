import type { OnboardingStepKey, OnboardingTaskKey } from "./config";

/**
 * A task the citizen is allowed to see, reduced to the keys of the task and
 * of its permitted steps. The client components resolve titles and contents
 * from the static config; only these keys and the progress rows cross the
 * server/client boundary.
 */
export interface EligibleOnboardingTask {
  readonly key: OnboardingTaskKey;
  /** Keys of the permitted steps, in the order of the config */
  readonly stepKeys: readonly OnboardingStepKey[];
}

export interface OnboardingState {
  readonly eligibleTasks: readonly EligibleOnboardingTask[];
  /** Keys of the tasks the citizen completed or skipped */
  readonly completedTaskKeys: readonly string[];
  /**
   * Completed steps, encoded with `encodeOnboardingStepProgressKey()` so the
   * client can hold them in a flat set.
   */
  readonly completedStepProgressKeys: readonly string[];
}

export const encodeOnboardingStepProgressKey = (
  taskKey: string,
  stepKey: string,
) => `${taskKey}/${stepKey}`;
