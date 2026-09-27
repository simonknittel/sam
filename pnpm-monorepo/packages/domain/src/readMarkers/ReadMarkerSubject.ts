/**
 * The item types that can carry read markers. Each one has its own foreign
 * key column on the `ReadMarker` model.
 */
export enum ReadMarkerSubject {
  Task = "task",
  Event = "event",
}
