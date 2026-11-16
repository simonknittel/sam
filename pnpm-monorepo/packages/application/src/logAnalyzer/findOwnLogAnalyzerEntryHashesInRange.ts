import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { findOwnLogAnalyzerEntryHashPage } from "./findOwnLogAnalyzerEntryHashes.js";
import type { LogAnalyzerSharingOptions } from "./logAnalyzerAccess.js";

export interface FindOwnLogAnalyzerEntryHashesInRangeInput {
  readonly from?: Date | undefined;
  /** Exclusive */
  readonly to?: Date | undefined;
  /** The last hash of the previous page. Absent for the first request. */
  readonly cursorHash?: string | undefined;
}

/**
 * The hashes of the entries of a date range which the citizen of the actor
 * already shared. The rolling window of `findOwnLogAnalyzerEntryHashes` does
 * not reach older entries, thus the sharing of older entries asks here which
 * of them the server already holds.
 */
export const findOwnLogAnalyzerEntryHashesInRange = (
  context: ApplicationContext,
  actor: Actor,
  input: FindOwnLogAnalyzerEntryHashesInRangeInput,
  options: LogAnalyzerSharingOptions,
) =>
  findOwnLogAnalyzerEntryHashPage(
    context,
    actor,
    { gte: input.from, lt: input.to },
    input.cursorHash,
    options,
  );
