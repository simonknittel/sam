"use client";

import clsx from "clsx";
import type { ComponentProps } from "react";
import { EditableField } from "./EditableField";

interface Props {
  readonly className?: string;
  readonly rowId: string;
  readonly columnName: string;
  readonly initialValue: string | number;
  readonly action: (formData: FormData) => Promise<
    | {
        success: string;
      }
    | { error: string }
  >;
  readonly type?: Exclude<ComponentProps<"input">["type"], "datetime-local">;
  /** Shows the value in one line, with an ellipsis when it is too long */
  readonly truncate?: boolean;
  /** Shows the value in at most two lines, with an ellipsis after them */
  readonly twoLines?: boolean;
  /** False permits an empty value, for example to remove an optional text */
  readonly required?: boolean;
  readonly maxLength?: number;
}

export const EditableInput = ({
  className,
  rowId,
  columnName,
  initialValue,
  action,
  type = "text",
  truncate = false,
  twoLines = false,
  required = true,
  maxLength,
}: Props) => {
  return (
    <EditableField
      className={clsx(
        { "max-w-full min-w-0": truncate || twoLines },
        className,
      )}
      displayButtonClassName={clsx("hover:cursor-pointer", {
        "min-w-0": truncate || twoLines,
      })}
      saveButtonClassName="hover:cursor-pointer"
      rowId={rowId}
      columnName={columnName}
      initialValue={initialValue}
      action={action}
      parseSubmittedValue={(submittedValue) =>
        typeof submittedValue === "string" ? submittedValue : ""
      }
      renderInput={({ value, isPending, setInputElement }) => (
        <input
          type={type}
          name={columnName}
          defaultValue={value}
          disabled={isPending}
          className={clsx("w-full rounded-secondary bg-neutral-700 px-1", {
            "animate-pulse": isPending,
          })}
          autoFocus
          required={required}
          maxLength={maxLength}
          ref={setInputElement}
        />
      )}
      renderDisplay={(value) =>
        truncate || twoLines ? (
          <span
            className={clsx({
              truncate,
              "line-clamp-2 wrap-break-word": twoLines,
            })}
            title={String(value)}
          >
            {value || "-"}
          </span>
        ) : (
          value || "-"
        )
      }
    />
  );
};
