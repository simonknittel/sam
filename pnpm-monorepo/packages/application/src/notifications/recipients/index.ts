/**
 * The recipient rules of the notification router: for each notification
 * type, the citizens who get it. No actor and no permission check of a
 * caller: the rule is the check of the receivers for its feature.
 * `storeOnSiteNotifications()` adds the clearance.
 */
export {
  findEventBriefingAudienceRecipients,
  findEventBriefingUpdatedRecipients,
} from "./eventBriefingAudience.js";
export { findEventCitizenRecipient } from "./eventCitizen.js";
export { findEventCreatedRecipients } from "./eventCreated.js";
export {
  findEventLineupEnabledRecipients,
  findEventPositionAssignedRecipient,
  findEventPositionUnassignedRecipient,
  findEventPositionVacatedRecipients,
} from "./eventLineup.js";
export { findEventOrganizerRecipients } from "./eventOrganizers.js";
export {
  findEventDeletedRecipients,
  findEventParticipantRecipients,
} from "./eventParticipants.js";
export { findEventPositionApplicationRecipients } from "./eventPositionApplicationCreated.js";
export type { EventNotificationRecipients } from "./eventRecipients.js";
export { findFleetUpdateReminderRecipient } from "./fleetUpdateReminder.js";
export { findGreetingRecipient } from "./greetingRecipients.js";
export {
  findManualNotificationRecipients,
  type ManualNotificationRecipients,
} from "./manualNotificationCreated.js";
export {
  findPenaltyEntryExpiredRecipient,
  findPenaltyEntryRecipient,
} from "./penaltyEntry.js";
export {
  findPayoutDisbursedRecipients,
  findPayoutReminderRecipients,
  findPayoutStartedRecipients,
} from "./profitDistributionPayout.js";
export type { Recipient } from "./recipient.js";
export { findRoleAddedRecipient } from "./roleAdded.js";
export { findRoleLevelIncreasedRecipient } from "./roleLevelIncreased.js";
export { findSilcTransactionRecipients } from "./silcTransactionsCreated.js";
export { findTaskAcceptedRecipients } from "./taskAccepted.js";
export { findTaskAssignmentRecipients } from "./taskAssignmentUpdated.js";
export { findTaskCancelledRecipients } from "./taskCancelled.js";
export { findTaskCompletedRecipients } from "./taskCompleted.js";
export {
  TaskCreatedRecipientKind,
  findTaskCreatedRecipients,
  type TaskCreatedRecipientGroup,
} from "./taskCreated.js";
export { findTaskDeadlineReminderRecipients } from "./taskDeadlineReminder.js";
export { findTaskDeletedRecipients } from "./taskDeleted.js";
export { findWikiCitizenMentionedRecipient } from "./wikiCitizenMentioned.js";
export { findWikiPageReportedRecipients } from "./wikiPageReported.js";
