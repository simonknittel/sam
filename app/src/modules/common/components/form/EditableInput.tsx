"use client";

import clsx from "clsx";
import { useRef, useState, useTransition, type ComponentProps } from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";
import { useOutsideClick } from "../../utils/useOutsideClick";

interface Props {
  readonly className?: string;
  readonly rowId: string;
  readonly columnName: string;
  readonly initialValue: string | number;
  readonly action: (formData: FormData) => Promise<
    | {
        success: string;
      }
    | { error: string; errorDetails?: unknown }
  >;
  readonly type?: Exclude<ComponentProps<"input">["type"], "datetime-local">;
}

export const EditableInput = ({
  className,
  rowId,
  columnName,
  initialValue,
  action,
  type = "text",
}: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref: outsideRef } = useOutsideClick(() => {
    setIsEditing(false);
  });

  const handleClick = () => {
    setIsEditing(true);
  };

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      try {
        const response = await action(formData);

        if ("error" in response) {
          /**
           * `setTimeout()` is needed here because `isPending` is used for the
           * `disabled` attribute on the input element and `isPending` only
           * reverts to false once this transition finishes. This would lead to
           * calling `focus()` too early.
           */
          setTimeout(() => {
            inputRef.current?.focus();
          }, 1);

          toast.error(response.error);
          console.error(response);
          return;
        }

        toast.success(response.success);
        setValue((formData.get(columnName) as string) || "");
        setIsEditing(false);
      } catch (error) {
        /**
         * `setTimeout()` is need here because `isPending` is used for the
         * `disabled` attribute on the input element and `isPending` only
         * reverts to false once this transition finishes. This would lead to
         * calling `focus()` too early.
         */
        setTimeout(() => {
          inputRef.current?.focus();
        }, 1);

        toast.error("Beim Speichern ist ein Fehler aufgetreten.");
        console.error(error);
      }
    });
  };

  return (
    <span
      className={clsx(
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
          ref={outsideRef}
        >
          <input type="hidden" name="id" value={rowId} />

          <input
            type={type}
            name={columnName}
            defaultValue={value}
            disabled={isPending}
            className={clsx("rounded-secondary bg-neutral-700 px-1 w-full", {
              "animate-pulse": isPending,
            })}
            autoFocus
            required
            ref={inputRef}
          />

          <button disabled={isPending} className="group" title="Speichern">
            {isPending ? (
              <FaSpinner className="text-brand-red-500 animate-spin" />
            ) : (
              <FaSave className="text-brand-red-500 group-hover:text-brand-red-300" />
            )}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex gap-2 items-center group text-left"
          title="Klicken, um zu bearbeiten"
        >
          {value || "-"}
          <FaPen className="flex-none text-brand-red-500 group-hover:text-brand-red-300 text-sm" />
        </button>
      )}
    </span>
  );
};
