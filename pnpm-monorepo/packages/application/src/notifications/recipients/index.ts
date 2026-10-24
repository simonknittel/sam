/**
 * The recipient rules of the notification router: for each notification
 * type, the citizens who get it. No actor and no permission check of a
 * caller: the rule is the check of the receivers for its feature.
 * `storeOnSiteNotifications()` adds the clearance.
 */
export { findEventBriefingPublishedRecipients } from "./eventBriefingPublished.js";
export { findEventCreatedRecipients } from "./eventCreated.js";
export {
  findEventDeletedRecipients,
  findEventParticipantRecipients,
} from "./eventParticipants.js";
export { findEventParticipationRecipient } from "./eventParticipation.js";
export type { EventNotificationRecipients } from "./eventRecipients.js";
export { findGreetingRecipient } from "./greetingRecipients.js";
export {
  findManualNotificationRecipients,
  type ManualNotificationRecipients,
} from "./manualNotificationCreated.js";
export { findPenaltyEntryRecipient } from "./penaltyEntryCreated.js";
export {
  findPayoutDisbursedRecipients,
  findPayoutStartedRecipients,
} from "./profitDistributionPayout.js";
export type { Recipient } from "./recipient.js";
export { findRoleAddedRecipient } from "./roleAdded.js";
export { findSilcTransactionRecipients } from "./silcTransactionsCreated.js";
export { findTaskAssignmentRecipients } from "./taskAssignmentUpdated.js";
export {
  TaskCreatedRecipientKind,
  findTaskCreatedRecipients,
  type TaskCreatedRecipientGroup,
} from "./taskCreated.js";
export { findTaskDeletedRecipients } from "./taskDeleted.js";
export { findWikiCitizenMentionedRecipient } from "./wikiCitizenMentioned.js";
export { findWikiPageReportedRecipients } from "./wikiPageReported.js";
