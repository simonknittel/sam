import type { PermissionSet } from "@sam-monorepo/domain";

export interface ChangelogEntrySource {
  readonly key: string;
  /** ISO date (`YYYY-MM-DD`) */
  readonly date: string;
  readonly title: string;
  readonly tags: string[];
  readonly isTracked: boolean;
  /** Null for all readers */
  readonly requiresAuth: {
    readonly resource: PermissionSet["resource"];
    readonly operation: PermissionSet["operation"];
  } | null;
  readonly markdown: string;
}

/** A changelog entry that the app shows as new until the citizen saw it */
export interface TrackedChangelogEntry {
  readonly key: string;
  /** ISO date (`YYYY-MM-DD`) */
  readonly date: string;
}

/**
 * The changelog entries of the host. The entries are React code of the
 * Next.js app, thus only the app has them.
 */
export interface ChangelogSource {
  readonly list: () => Promise<ChangelogEntrySource[]>;
  /** Without the Markdown: the shell of the app reads it on each page */
  readonly listTrackedEntries: () => readonly TrackedChangelogEntry[];
}
