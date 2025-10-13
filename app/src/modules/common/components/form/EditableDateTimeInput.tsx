import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";
import { useOutsideClick } from "../../utils/useOutsideClick";

interface Props {
  readonly className?: string;
  readonly rowId: string;
  readonly columnName: string;
  readonly initialValue?: Date | null;
  readonly action: (formData: FormData) => Promise<
    | {
        success: string;
      }
    | { error: string; errorDetails?: unknown }
  >;
  readonly required?: boolean;
}

export const EditableDateTimeInput = ({
  className,
  rowId,
  columnName,
  initialValue,
  action,
  required,
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
        const date = new Date(formData.get(columnName) as string);
        setValue(isNaN(date.getTime()) ? null : date);
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
            type="datetime-local"
            name={columnName}
            defaultValue={value?.toLocaleString("sv-SE", {
              timeZone: "Europe/Berlin",
            })}
            disabled={isPending}
            className={clsx("rounded-secondary bg-neutral-700 px-1 w-full", {
              "animate-pulse": isPending,
            })}
            autoFocus
            required={required}
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
          {formatDate(value) || "-"}
          <FaPen className="flex-1 text-brand-red-500 group-hover:text-brand-red-300 text-sm" />
        </button>
      )}
    </span>
  );
};
