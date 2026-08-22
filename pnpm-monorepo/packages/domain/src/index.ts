/**
 * Domain vocabulary and pure domain logic shared between the Next.js app
 * and the Lambdas. Everything here is side-effect-free: no database client,
 * no environment reads — consumers load the data and pass it in. Sharing
 * these definitions replaces the former copy-mirrored files in both apps.
 */
export {
  AuditEventType,
  type AuditEventDataByType,
  type AuditEventInput,
} from "./AuditEventTypes.js";
export { buildBriefingRootPageSeed } from "./buildBriefingRootPageSeed.js";
export {
  NOTIFIABLE_CITIZEN_WHERE,
  buildEventRecipientWhere,
  type EventRecipientInput,
} from "./events/eventRecipients.js";
export { isAllowedWebPushEndpointUrl } from "./isAllowedWebPushEndpointUrl.js";
export { ORG_ID } from "./ORG_ID.js";
export { calculateSilcBalances } from "./silc/calculateSilcBalances.js";
export { getAuecPerSilc } from "./silc/getAuecPerSilc.js";
export { getTotalSilc } from "./silc/getTotalSilc.js";
export { SILC_TRANSACTIONS_OF_ALL_CITIZENS_QUERY } from "./silc/silcTransactionsOfAllCitizensQuery.js";
export {
  UNUSED_UPLOAD_WHERE,
  UPLOAD_USAGE_RELATIONS,
  type UploadUsageRelation,
} from "./uploadUsageRelations.js";
