import { ReadMarkerSubject } from "@sam-monorepo/domain";

/**
 * The app whose dot badge counts the new items of each subject type. The
 * rules of the subject types are in the application package
 * (`READ_MARKER_SUBJECT_RULES`, with the steps to add a subject type).
 */
export const READ_MARKER_APP_SLUGS: Readonly<
  Record<ReadMarkerSubject, string>
> = {
  [ReadMarkerSubject.Task]: "tasks",
  [ReadMarkerSubject.Event]: "events",
  [ReadMarkerSubject.ChangelogEntry]: "changelog",
};
