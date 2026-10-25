import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { READ_MARKER_SUBJECT_RULES } from "./readMarkerSubjects.js";

export interface FindNewItemIdsInput {
  readonly subject: ReadMarkerSubject;
  readonly subjectIds: readonly string[];
}

/**
 * Of the listed items, the ones which are new for the actor. Batched into a
 * single query, thus a list does not ask once for each row. Checks no
 * permission: the caller has already applied the visibility and the read
 * permission to the ids. Empty for an actor without a citizen.
 */
export const findNewItemIds = async (
  context: ApplicationContext,
  actor: Actor,
  input: FindNewItemIdsInput,
): Promise<string[]> => {
  if (input.subjectIds.length === 0) return [];

  return READ_MARKER_SUBJECT_RULES[input.subject].findNewIds(
    context,
    actor,
    input.subjectIds,
  );
};
