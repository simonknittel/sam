"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import type { VisibleTask } from "@sam-monorepo/application";
import { TbCancel } from "react-icons/tb";
import { cancelTask } from "../actions/cancelTask";

interface Props {
  readonly className?: string;
  readonly task: Pick<VisibleTask, "id" | "title">;
}

export const CancelTask = ({ className, task }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={cancelTask}
      hiddenFields={[{ name: "id", value: task.id }]}
      trigger={(isPending) => (
        <Button2
          type="submit"
          disabled={isPending}
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
        >
          {isPending ? <AsciiSpinner /> : <TbCancel />}
          Task abbrechen
        </Button2>
      )}
      title="Task abbrechen?"
      description={
        <>
          Willst du den Task <span className="font-bold">{task.title}</span>{" "}
          abbrechen?
        </>
      }
      confirmLabel="Speichern"
    />
  );
};
