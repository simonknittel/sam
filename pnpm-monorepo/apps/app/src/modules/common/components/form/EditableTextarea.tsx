"use client";

import clsx from "clsx";
import { Markdown } from "../Markdown";
import { EditableField } from "./EditableField";

interface Props {
  readonly className?: string;
  readonly classNameTextarea?: string;
  readonly rowId: string;
  readonly columnName: string;
  readonly initialValue?: string | null;
  readonly action: (formData: FormData) => Promise<
    | {
        success: string;
      }
    | { error: string; errorDetails?: unknown }
  >;
}

export const EditableTextarea = ({
  className,
  classNameTextarea,
  rowId,
  columnName,
  initialValue,
  action,
}: Props) => {
  return (
    <EditableField
      className={className}
      displayButtonClassName="w-full"
      saveButtonClassName="flex-none"
      rowId={rowId}
      columnName={columnName}
      initialValue={initialValue}
      action={action}
      parseSubmittedValue={(submittedValue) =>
        typeof submittedValue === "string" ? submittedValue : ""
      }
      renderInput={({ value, isPending, setInputElement }) => (
        <textarea
          name={columnName}
          defaultValue={value || ""}
          disabled={isPending}
          className={clsx(
            "field-sizing-content min-h-32 w-full rounded-secondary bg-neutral-700 px-1 align-middle",
            {
              "animate-pulse": isPending,
            },
            classNameTextarea,
          )}
          autoFocus
          ref={setInputElement}
        />
      )}
      renderDisplay={(value) => (
        <Markdown className="flex-1">{value || "-"}</Markdown>
      )}
    />
  );
};
