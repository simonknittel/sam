import clsx from "clsx";
import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";
import type { ServerAction } from "../../actions/types";
import { useOutsideClick } from "../../utils/useOutsideClick";

interface Props {
  readonly className?: string;
  readonly action: ServerAction;
  readonly initialValue: string;
}

export const EditableText = ({ className, action, initialValue }: Props) => {
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

        if (response.status === 200) {
          toast.success("Erfolgreich gespeichert");
          setValue(formData.get("value")?.toString() || "");
          setIsEditing(false);
        } else {
          /**
           * `setTimeout()` is need here because `isPending` is used for the
           * `disabled` attribute on the input element and `isPending` only
           * reverts to false once this transition finishes. This would lead to
           * calling `focus()` too early.
           */
          setTimeout(() => {
            inputRef.current?.focus();
          }, 1);

          toast.error(
            response.errorMessage ||
              "Beim Speichern ist ein Fehler aufgetreten.",
          );
        }
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
    <span className={clsx(className)}>
      {isEditing ? (
        <form
          action={formAction}
          className="flex gap-2 items-center -mx-1"
          ref={outsideRef}
        >
          <input
            type="text"
            name="value"
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
          className="flex gap-2 items-center group"
          title="Klicken, um zu bearbeiten"
        >
          {value}{" "}
          <FaPen className="text-brand-red-500 group-hover:text-brand-red-300" />
        </button>
      )}
    </span>
  );
};
