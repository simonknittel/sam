/**
 * The order is the order in which the app shows the tasks. The database stores
 * the keys of the tasks and the steps, thus a value must never change.
 */
export enum OnboardingTaskKey {
  Events = "events",
  Fleet = "fleet",
  BrowserNotifications = "browser-notifications",
  AvatarCreator = "avatar-creator",
  Profile = "profile",
}

export enum OnboardingStepKey {
  EventsCalendar = "events-calendar",
  EventsSignUp = "events-sign-up",
  EventsBriefing = "events-briefing",
  EventsLineup = "events-lineup",
  FleetIntroduction = "fleet-introduction",
  FleetAddShips = "fleet-add-ships",
  FleetOrgFleet = "fleet-org-fleet",
  NotificationsIntroduction = "notifications-introduction",
  NotificationsEnable = "notifications-enable",
  AvatarCreatorIntroduction = "avatar-creator-introduction",
  AvatarCreatorCreate = "avatar-creator-create",
  ProfileComplete = "profile-complete",
}

export interface OnboardingStepRule {
  readonly key: OnboardingStepKey;
  /** The step is only for a citizen who satisfies at least one string */
  readonly requiredPermissionStrings?: readonly string[];
}

export interface OnboardingTaskRule {
  readonly key: OnboardingTaskKey;
  readonly requiredPermissionStrings?: readonly string[];
  readonly steps: readonly OnboardingStepRule[];
}

/** The texts and the contents of the tasks are in the app. */
const ONBOARDING_TASK_RULE_FIELDS: Readonly<
  Record<OnboardingTaskKey, Omit<OnboardingTaskRule, "key">>
> = {
  [OnboardingTaskKey.Events]: {
    requiredPermissionStrings: ["event;read"],
    steps: [
      { key: OnboardingStepKey.EventsCalendar },
      { key: OnboardingStepKey.EventsSignUp },
      { key: OnboardingStepKey.EventsBriefing },
      { key: OnboardingStepKey.EventsLineup },
    ],
  },
  [OnboardingTaskKey.Fleet]: {
    requiredPermissionStrings: ["ship;manage"],
    steps: [
      { key: OnboardingStepKey.FleetIntroduction },
      { key: OnboardingStepKey.FleetAddShips },
      {
        key: OnboardingStepKey.FleetOrgFleet,
        requiredPermissionStrings: ["orgFleet;read"],
      },
    ],
  },
  [OnboardingTaskKey.BrowserNotifications]: {
    steps: [
      { key: OnboardingStepKey.NotificationsIntroduction },
      { key: OnboardingStepKey.NotificationsEnable },
    ],
  },
  [OnboardingTaskKey.AvatarCreator]: {
    steps: [
      { key: OnboardingStepKey.AvatarCreatorIntroduction },
      { key: OnboardingStepKey.AvatarCreatorCreate },
    ],
  },
  [OnboardingTaskKey.Profile]: {
    steps: [{ key: OnboardingStepKey.ProfileComplete }],
  },
};

export const getOnboardingTaskRule = (
  taskKey: OnboardingTaskKey,
): OnboardingTaskRule => ({
  key: taskKey,
  ...ONBOARDING_TASK_RULE_FIELDS[taskKey],
});

export const ONBOARDING_TASK_RULES: readonly OnboardingTaskRule[] =
  Object.values(OnboardingTaskKey).map(getOnboardingTaskRule);

export const encodeOnboardingStepProgressKey = (
  taskKey: string,
  stepKey: string,
) => `${taskKey}/${stepKey}`;
