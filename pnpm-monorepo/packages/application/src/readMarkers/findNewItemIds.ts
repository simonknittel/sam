import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { READ_MARKER_SUBJECT_RULES } from "./readMarkerSubjects.js";

export interface FindNewItemIdsInput {
  readonly subject: ReadMarkerSubject;
  readonly subjectIds: readonly string[];
}

/**
 * No permission check: the caller has applied the visibility and the read
 * permission to the ids
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
