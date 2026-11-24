"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { Markdown } from "@/modules/common/components/Markdown";
import { Tile } from "@/modules/common/components/Tile";
import type { VisibleTask } from "@sam-monorepo/application";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@sam-monorepo/domain";
import { useState } from "react";
import { FaPen, FaSave, FaTimes } from "react-icons/fa";
import { updateTaskDescription } from "../actions/updateTaskDescription";
import { TaskDescriptionHint } from "./TaskDescriptionHint";

const HEADING = "Briefing";

interface Props {
  readonly className?: string;
  readonly task: Pick<VisibleTask, "id" | "description">;
  readonly isEditable: boolean;
}

export const TaskBriefing = ({ className, task, isEditable }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const { formAction, isPending, getDefaultValueWithFallback } = useAction(
    updateTaskDescription,
    {
      onSuccess: () => setIsEditing(false),
    },
  );

  return (
    <Tile
      heading={HEADING}
      cta={
        isEditable &&
        !isEditing && (
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => setIsEditing(true)}
          >
            <FaPen />
            Bearbeiten
          </Button2>
        )
      }
      className={className}
    >
      {isEditing ? (
        <form action={formAction}>
          <input type="hidden" name="id" value={task.id} />

          <Textarea
            name="description"
            label={HEADING}
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

          <div className="mt-4 flex flex-wrap gap-2">
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
        </form>
      ) : (
        <Markdown>{task.description || "-"}</Markdown>
      )}
    </Tile>
  );
};
