/**
 * Values of the `data-onboarding-target` attributes which mark the elements
 * a tour step highlights. The components carrying the attribute import these
 * values, so the strings cannot drift apart. Kept separate from the task
 * config so the marker components don't pull the step contents (including
 * the screenshot assets) into their module graph.
 */
export enum OnboardingTargetId {
  DashboardCalendar = "dashboard-calendar",
  FleetAddShip = "fleet-add-ship",
  OrgFleet = "org-fleet",
  NotificationsEnable = "notifications-enable",
  AvatarCreator = "avatar-creator",
  ProfileForm = "profile-form",
}
