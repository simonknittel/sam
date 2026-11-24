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
  readonly truncate?: boolean;
  readonly twoLines?: boolean;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly fillWidth?: boolean;
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
  fillWidth = false,
}: Props) => {
  return (
    <EditableField
      className={clsx(
        { "max-w-full min-w-0": truncate || twoLines },
        className,
      )}
      formClassName={clsx({ "min-w-0 flex-1": fillWidth })}
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
