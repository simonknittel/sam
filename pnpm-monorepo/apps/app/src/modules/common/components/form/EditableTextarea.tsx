"use client";

import clsx from "clsx";
import { useRef, useState } from "react";
import { Markdown } from "../Markdown";
import { EditableField } from "./EditableField";

const DEFAULT_TEXTAREA_HEIGHT = 384;

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
  const markdownRef = useRef<HTMLDivElement>(null);
  const [textareaHeight, setTextareaHeight] = useState(DEFAULT_TEXTAREA_HEIGHT);

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
      onStartEditing={() => {
        if (markdownRef.current)
          setTextareaHeight(markdownRef.current.clientHeight);
      }}
      renderInput={({ value, isPending, setInputElement }) => (
        <textarea
          name={columnName}
          defaultValue={value || ""}
          disabled={isPending}
          className={clsx(
            "rounded-secondary bg-neutral-700 px-1 w-full h-32 align-middle",
            {
              "animate-pulse": isPending,
            },
            classNameTextarea,
          )}
          style={{
            height: textareaHeight,
          }}
          autoFocus
          ref={setInputElement}
        />
      )}
      renderDisplay={(value) => (
        <Markdown ref={markdownRef} className="flex-1">
          {value || "-"}
        </Markdown>
      )}
    />
  );
};
