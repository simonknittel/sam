/**
 * Its own module, not an export of the modal: the modal is a client
 * component, thus a server component that imported the enum from there would
 * receive a client reference instead of the value.
 */
export enum HistoryModalVariant {
  /** Keeps the box of a tertiary button, for a table cell */
  Button = "button",
  /** Only the icon, at the size of the value next to it */
  Inline = "inline",
}
