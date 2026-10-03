"use client";

import { formatDate } from "@/modules/common/utils/formatDate";
import { wallTimeSchema } from "@/modules/common/utils/wallTimeSchema";
import { instantToWallTime, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
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
    | { error: string }
  >;
  readonly required?: boolean;
}

/**
 * The input shows and sends a wall time in the time zone of the
 * organization. The action must read the value with `wallTimeSchema`. The
 * display after a save uses the same schema.
 */
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
        const result = wallTimeSchema.safeParse(submittedValue);
        return result.success ? result.data : null;
      }}
      renderInput={({ value, isPending, setInputElement }) => (
        <input
          type="datetime-local"
          name={columnName}
          defaultValue={
            value ? instantToWallTime(value, ORGANIZATION_TIMEZONE) : undefined
          }
          disabled={isPending}
          className={clsx("w-full rounded-secondary bg-neutral-700 px-1", {
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
