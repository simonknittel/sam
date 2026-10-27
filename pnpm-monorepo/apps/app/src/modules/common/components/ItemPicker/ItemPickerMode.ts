/**
 * Not in a "use client" module: a server component that renders a picker
 * must read the values of this enum.
 */
export enum ItemPickerMode {
  /** A click selects the item and closes the popover */
  Single = "single",
  /** A click selects or deselects the item, and the popover stays open */
  Multiple = "multiple",
}
