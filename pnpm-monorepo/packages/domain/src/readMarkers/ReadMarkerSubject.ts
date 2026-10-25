/**
 * The item types that can carry read markers. Each one has its own column on
 * the `ReadMarker` model.
 */
export enum ReadMarkerSubject {
  Task = "task",
  Event = "event",
  ChangelogEntry = "changelog_entry",
}
