"use client";

import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { EditableField } from "./EditableField";

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
  return (
    <EditableField
      className={className}
      penClassName="flex-1"
      rowId={rowId}
      columnName={columnName}
      initialValue={initialValue}
      action={action}
      parseSubmittedValue={(submittedValue) => {
        const date = new Date(
          typeof submittedValue === "string" ? submittedValue : "",
        );
        return isNaN(date.getTime()) ? null : date;
      }}
      renderInput={({ value, isPending, setInputElement }) => (
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
          ref={setInputElement}
        />
      )}
      renderDisplay={(value) => formatDate(value) || "-"}
    />
  );
};
