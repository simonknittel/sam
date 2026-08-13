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
  return (
    <EditableField
      className={className}
      displayButtonClassName="hover:cursor-pointer"
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
          className={clsx("rounded-secondary bg-neutral-700 px-1 w-full", {
            "animate-pulse": isPending,
          })}
          autoFocus
          required
          ref={setInputElement}
        />
      )}
      renderDisplay={(value) => value || "-"}
    />
  );
};
