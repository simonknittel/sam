"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useClickAway } from "@uidotdev/usehooks";
import clsx from "clsx";
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave } from "react-icons/fa";

interface RenderInputContext<Value> {
  readonly value: Value;
  readonly isPending: boolean;
  /** Pass as `ref` so the input regains focus when saving fails */
  readonly setInputElement: (element: HTMLElement | null) => void;
}

interface Props<Value> {
  readonly className?: string;
  readonly displayButtonClassName?: string;
  readonly saveButtonClassName?: string;
  readonly penClassName?: string;
  readonly rowId: string;
  readonly columnName: string;
  readonly initialValue: Value;
  readonly action: (formData: FormData) => Promise<
    | {
        success: string;
      }
    | { error: string; errorDetails?: unknown }
  >;
  /** Derives the new display value from the submitted form value */
  readonly parseSubmittedValue: (
    submittedValue: FormDataEntryValue | null,
  ) => Value;
  readonly renderInput: (context: RenderInputContext<Value>) => ReactNode;
  readonly renderDisplay: (value: Value) => ReactNode;
  readonly onStartEditing?: () => void;
}

/**
 * The shell shared by the Editable* inline-edit fields: a display button
 * that flips into a small form on click, saving through the given action
 * and closing on outside click.
 */
export const EditableField = <Value,>({
  className,
  displayButtonClassName,
  saveButtonClassName,
  penClassName,
  rowId,
  columnName,
  initialValue,
  action,
  parseSubmittedValue,
  renderInput,
  renderDisplay,
  onStartEditing,
}: Props<Value>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialValue);
  const inputElementRef = useRef<HTMLElement | null>(null);

  const outsideClickRef = useClickAway<HTMLFormElement>(() => {
    setIsEditing(false);
  });

  /** Only ever passed as the input element's `ref`, so the write happens
   * during commit, not during render. */
  const setInputElement = useCallback((element: HTMLElement | null) => {
    inputElementRef.current = element;
  }, []);

  const handleStartEditing = () => {
    onStartEditing?.();
    setIsEditing(true);
  };

  /**
   * `setTimeout()` is needed because `isPending` is used for the `disabled`
   * attribute on the input element and `isPending` only reverts to false
   * once the transition finishes. This would lead to calling `focus()` too
   * early.
   */
  const focusInputAfterTransition = () => {
    setTimeout(() => {
      inputElementRef.current?.focus();
    }, 1);
  };

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      try {
        const response = await action(formData);

        if ("error" in response) {
          focusInputAfterTransition();
          toast.error(response.error);
          console.error(response);
          return;
        }

        toast.success(response.success);
        setValue(parseSubmittedValue(formData.get(columnName)));
        setIsEditing(false);
      } catch (error) {
        focusInputAfterTransition();
        toast.error("Beim Speichern ist ein Fehler aufgetreten.");
        console.error(error);
      }
    });
  };

  return (
    /**
     * inline-flex, not the default inline: both children are flex boxes, so
     * an inline wrapper generates line boxes of its own next to them and
     * takes the hit test for clicks aimed at the button inside.
     */
    <span
      className={clsx(
        "inline-flex",
        {
          "w-full": isEditing,
        },
        className,
      )}
    >
      {isEditing ? (
        <form
          action={formAction}
          className="flex gap-2 items-center mx-1"
          ref={outsideClickRef}
        >
          <input type="hidden" name="id" value={rowId} />

          {/* eslint-disable-next-line react-hooks/refs -- setInputElement is a ref callback the variants pass as the input's `ref`, so the ref write happens during commit, not render */}
          {renderInput({
            value,
            isPending,
            setInputElement,
          })}

          <button
            disabled={isPending}
            className={clsx("group", saveButtonClassName)}
            title="Speichern"
          >
            {isPending ? (
              <AsciiSpinner className="text-brand-red-500" />
            ) : (
              <FaSave className="text-brand-red-500 group-hover:text-brand-red-300" />
            )}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleStartEditing}
          className={clsx(
            "flex gap-2 items-center group text-left",
            displayButtonClassName,
          )}
          title="Klicken, um zu bearbeiten"
        >
          {renderDisplay(value)}
          <FaPen
            className={clsx(
              "text-brand-red-500 group-hover:text-brand-red-300 text-sm",
              penClassName ?? "flex-none",
            )}
          />
        </button>
      )}
    </span>
  );
};
