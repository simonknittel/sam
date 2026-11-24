import "server-only";

import { env } from "@/env";
import { CHANGELOG_ENTRIES } from "@/modules/changelog/entries";
import type { ChangelogEntrySource } from "@sam-monorepo/application";
import { renderChangelogEntryToMarkdown } from "./renderChangelogEntryToMarkdown";

const renderEntries = () => {
  const baseUrl = new URL(env.NEXT_PUBLIC_BASE_URL);

  return Promise.all(
    CHANGELOG_ENTRIES.map(async (entry): Promise<ChangelogEntrySource> => ({
      key: entry.key,
      date: entry.date,
      title: entry.title,
      tags: entry.tags ?? [],
      isTracked: entry.isTracked ?? false,
      requiresAuth: entry.requiresAuth
        ? {
            resource: entry.requiresAuth.resource,
            operation: entry.requiresAuth.action,
          }
        : null,
      markdown: await renderChangelogEntryToMarkdown(entry, baseUrl),
    })),
  );
};

/**
 * The entries change only with a deployment, thus they render once per
 * process. A rejected promise stays cached: the rendering gives the same
 * result for the same entries.
 */
let entries: Promise<ChangelogEntrySource[]> | undefined;

export const listChangelogEntriesAsMarkdown = () =>
  (entries ??= renderEntries());
