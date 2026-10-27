import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByCursor,
} from "../pagination.js";
import { findVisibleRoleTagBadges } from "./roleTagBadges.js";
import { toRoleTagOutput, type RoleTagOutput } from "./roleTagOutput.js";

export const listRoleTagsInputSchema = z.object({
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListRoleTagsInput = z.output<typeof listRoleTagsInputSchema>;

export interface ListRoleTagsOutput {
  readonly tags: RoleTagOutput[];
  readonly next_cursor: string | null;
}

/**
 * The tags that the actor can see (see `findVisibleRoleTagBadges()`), sorted
 * by name, one page. The cursor is the id of a tag.
 *
 * @throws ValidationError when no tag of the list has the cursor
 */
export const listRoleTags = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListRoleTagsInput,
): Promise<ListRoleTagsOutput> => {
  const page = paginateByCursor(
    await findVisibleRoleTagBadges(context, actor),
    {
      cursor: input.cursor,
      pageSize: input.limit,
      getCursor: (tag) => tag.id,
    },
  );

  return {
    tags: page.items.map((tag) => toRoleTagOutput(context, tag)),
    next_cursor: page.nextCursor,
  };
};
