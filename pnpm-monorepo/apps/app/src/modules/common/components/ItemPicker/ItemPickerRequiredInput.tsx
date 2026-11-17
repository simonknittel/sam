"use client";

interface Props {
  /** The selected item, or an empty string */
  readonly value: string;
  /** A submit found no selected item */
  readonly onInvalid: () => void;
}

/**
 * Makes a picker in single mode a required field. The browser does not
 * submit the form while this field is empty. The field has no name, thus the
 * form does not submit its value. The message of the browser would show at
 * this hidden field, thus `onInvalid` must show the message of the picker and
 * focus its trigger.
 */
export const ItemPickerRequiredInput = ({ value, onInvalid }: Props) => {
  return (
    <input
      required
      tabIndex={-1}
      aria-hidden
      value={value}
      onChange={() => undefined}
      onInvalid={(event) => {
        event.preventDefault();
        onInvalid();
      }}
      className="sr-only"
    />
  );
};
