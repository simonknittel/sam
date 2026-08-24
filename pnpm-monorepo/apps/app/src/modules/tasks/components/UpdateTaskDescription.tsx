"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { Markdown } from "@/modules/common/components/Markdown";
import type { Task } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPen, FaSave, FaTimes } from "react-icons/fa";
import { updateTaskDescription } from "../actions/updateTaskDescription";
import { TASK_DESCRIPTION_MAX_LENGTH } from "../utils/taskConstraints";
import { TaskDescriptionHint } from "./TaskDescriptionHint";

interface Props {
  readonly className?: string;
  readonly task: Pick<Task, "id" | "description">;
}

/**
 * The description of a task, switched into a plain textarea by an edit
 * button. Unlike the inline editors of the other task fields, the
 * description is long enough that it needs the room of the whole tile.
 */
export const UpdateTaskDescription = ({ className, task }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(updateTaskDescription, {
      errorToast: false,
      onSuccess: () => setIsEditing(false),
    });

  if (!isEditing)
    return (
      <div className={clsx("flex flex-col items-start gap-4", className)}>
        <Markdown className="w-full">{task.description || "-"}</Markdown>

        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setIsEditing(true)}
        >
          <FaPen />
          Bearbeiten
        </Button2>
      </div>
    );

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="id" value={task.id} />

      <Textarea
        name="description"
        label="Beschreibung"
        hint={<TaskDescriptionHint />}
        maxLength={TASK_DESCRIPTION_MAX_LENGTH}
        defaultValue={getDefaultValueWithFallback(
          "description",
          task.description ?? "",
        )}
        disabled={isPending}
        autoFocus
        sizeToContent
        /* The tile heading already names the field */
        className="sr-only"
        classNameTextarea="min-h-32"
      />

      <div className="flex flex-wrap gap-2 mt-4">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>

        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
          onClick={() => setIsEditing(false)}
          disabled={isPending}
        >
          <FaTimes />
          Abbrechen
        </Button2>
      </div>

      <ActionErrorNote state={state} className="mt-4" />
    </form>
  );
};
