/** The use cases of the penalty points */
export {
  createPenaltyEntry,
  createPenaltyEntryInputSchema,
  type CreatePenaltyEntryOutput,
} from "./createPenaltyEntry.js";
export {
  deletePenaltyEntry,
  deletePenaltyEntryInputSchema,
  type DeletePenaltyEntryOutput,
} from "./deletePenaltyEntry.js";
export {
  PenaltyEntryStatus,
  listPenaltyEntries,
  listPenaltyEntriesInputSchema,
  type ListPenaltyEntriesOutput,
} from "./listPenaltyEntries.js";
export {
  notifyExpiredPenaltyEntries,
  type NotifyExpiredPenaltyEntriesOutput,
} from "./notifyExpiredPenaltyEntries.js";
export { PenaltyEntryErrorMessage } from "./penaltyEntryErrors.js";
export type {
  PenaltyEntryCitizenOutput,
  PenaltyEntryOutput,
} from "./penaltyEntryOutput.js";
