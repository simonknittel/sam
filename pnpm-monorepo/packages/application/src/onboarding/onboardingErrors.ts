export enum OnboardingErrorMessage {
  /** A `ForbiddenError` */
  TaskNotOpen = "The onboarding task is not open to the actor",
  /** A `ForbiddenError` */
  StepNotOpen = "The onboarding step is not open to the actor",
  /** A `NotFoundError` */
  StepNotFound = "The onboarding step does not belong to the task",
}
