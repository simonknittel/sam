"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

interface Props {
  readonly isOpen: boolean;
  /** Runs when the dialog closes: "Abbrechen", Escape or the submission */
  readonly onClose: () => void;
  readonly title: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly confirmDisabled?: boolean;
  /** Content between the description and the buttons, for example fields */
  readonly children?: ReactNode;
}

/**
 * Escape closes only this dialog, and the script closes it, not the browser
 * (native `cancel`):
 * - A Base UI popover or modal around the dialog also closes on Escape, and
 *   removes the dialog with it. Thus the event stops in the capture phase on
 *   the document, before it gets to the listeners of Base UI.
 * - When the browser closes the dialog, Base UI around it sees no focused
 *   element for a moment and moves the focus to its popup. Then the focus
 *   does not go back to the trigger. A close by the script does not cause
 *   this problem.
 */
const closeOnEscape = (event: KeyboardEvent<HTMLDialogElement>) => {
  if (event.key !== "Escape") return;

  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.close();
};

/**
 * A modal confirmation before a form submits. Render it inside the form: the
 * confirm button is a submit button of that form, and the fields in
 * `children` are fields of that form. The content exists only while the
 * dialog is open, as with a dialog in a portal.
 */
export const AlertDialog = ({ isOpen, ...props }: Props) => {
  if (!isOpen) return null;

  return <OpenAlertDialog {...props} />;
};

type OpenAlertDialogProps = Omit<Props, "isOpen">;

const OpenAlertDialog = ({
  onClose,
  title,
  description,
  confirmLabel,
  confirmDisabled,
  children,
}: OpenAlertDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { pending } = useFormStatus();

  useEffect(() => {
    dialogRef.current?.showModal();
    /**
     * The initial focus is on "Abbrechen". The `autofocus` attribute cannot
     * do this: React does not render it, it only focuses the element when it
     * mounts, and then the dialog is not open yet.
     */
    cancelButtonRef.current?.focus();
  }, []);

  /**
   * Close when the submission starts, not on the click of the confirm button:
   * an invalid field stops the submission, and the browser shows the error
   * at the field in the dialog.
   */
  useEffect(() => {
    if (pending) dialogRef.current?.close();
  }, [pending]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onKeyDownCapture={closeOnEscape}
      /**
       * The dialog inherits the text styles of the location of the form, for
       * example a table cell. Thus it sets all text styles itself.
       */
      className="m-auto w-full max-w-lg cursor-auto gap-4 rounded-primary bg-neutral-800 p-4 text-left font-sans text-base font-normal tracking-normal whitespace-normal text-neutral-50 normal-case not-italic transition duration-200 backdrop:bg-neutral-800/50 backdrop:backdrop-blur-sm open:grid starting:scale-90 starting:opacity-0"
    >
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>

        <p id={descriptionId} className="text-sm">
          {description}
        </p>
      </div>

      {children}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="flex min-h-11 cursor-pointer items-center justify-center gap-4 rounded-secondary border border-brand-red-500 px-6 py-2 text-base text-brand-red-500 uppercase hover:border-brand-red-300 hover:text-brand-red-300 focus-visible:border-brand-red-300 focus-visible:text-brand-red-300 active:border-brand-red-300 active:text-brand-red-300"
        >
          Abbrechen
        </button>

        <button
          type="submit"
          disabled={confirmDisabled}
          className="flex min-h-11 items-center justify-center gap-4 rounded-secondary bg-brand-red-500 px-6 py-2 text-base font-bold text-neutral-50 uppercase enabled:cursor-pointer enabled:hover:bg-brand-red-300 enabled:focus-visible:bg-brand-red-300 enabled:active:bg-brand-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
};
