import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext, ChangelogEntrySource } from "../context.js";
import { ConflictError } from "../errors.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByCursor,
} from "../pagination.js";
import { ChangelogErrorMessage } from "./changelogErrors.js";
import { isChangelogEntryReadable } from "./isChangelogEntryReadable.js";
import { CHANGELOG_QUARTER_SLUG_PATTERN, getQuarterOfDate } from "./quarter.js";

export const listChangelogEntriesInputSchema = z.object({
  quarter: z
    .string()
    .regex(CHANGELOG_QUARTER_SLUG_PATTERN)
    .optional()
    .describe(
      "Only the entries of this quarter, for example 2026-q4. Without it, the list starts with the newest entry.",
    ),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListChangelogEntriesInput = z.output<
  typeof listChangelogEntriesInputSchema
>;

export interface ChangelogEntrySummary {
  readonly key: string;
  /** `YYYY-MM-DD` */
  readonly date: string;
  readonly title: string;
  readonly tags: string[];
  /** Whether the app shows the entry as unseen until the user saw it */
  readonly is_tracked: boolean;
  readonly markdown: string;
}

export interface ListChangelogEntriesOutput {
  readonly entries: ChangelogEntrySummary[];
  readonly next_cursor: string | null;
}

const compareChangelogEntries = (
  first: ChangelogEntrySource,
  second: ChangelogEntrySource,
) =>
  second.date.localeCompare(first.date, "en") ||
  first.key.localeCompare(second.key, "en");

/** Reading does not mark the entries as seen */
export const listChangelogEntries = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListChangelogEntriesInput,
): Promise<ListChangelogEntriesOutput> => {
  if (!context.changelog)
    throw new ConflictError(ChangelogErrorMessage.NotAvailable);

  const entries = (await context.changelog.list())
    .filter(
      (entry) =>
        isChangelogEntryReadable(actor, entry) &&
        (!input.quarter || getQuarterOfDate(entry.date).slug === input.quarter),
    )
    .toSorted(compareChangelogEntries);

  const page = paginateByCursor(entries, {
    cursor: input.cursor,
    pageSize: input.limit,
    getCursor: (entry) => entry.key,
  });

  return {
    entries: page.items.map((entry) => ({
      key: entry.key,
      date: entry.date,
      title: entry.title,
      tags: [...entry.tags],
      is_tracked: entry.isTracked,
      markdown: entry.markdown,
    })),
    next_cursor: page.nextCursor,
  };
};
