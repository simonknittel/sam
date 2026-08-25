"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import clsx from "clsx";
import { FaCheckCircle } from "react-icons/fa";
import { getOnboardingTaskByKey } from "../utils/config";
import {
  encodeOnboardingStepProgressKey,
  type EligibleOnboardingTask,
} from "../utils/types";
import { useOnboarding } from "./OnboardingProvider";

interface Props {
  readonly task: EligibleOnboardingTask;
}

export const OnboardingTaskListItem = ({ task }: Props) => {
  const {
    completedTaskKeys,
    completedStepProgressKeys,
    startTour,
    markTaskAsDone,
  } = useOnboarding();
  const { closePopover } = usePopoverBaseUI();

  const taskConfig = getOnboardingTaskByKey(task.key);
  if (!taskConfig) return null;

  const isDone = completedTaskKeys.has(task.key);
  const completedStepCount = task.stepKeys.filter((stepKey) =>
    completedStepProgressKeys.has(
      encodeOnboardingStepProgressKey(task.key, stepKey),
    ),
  ).length;

  const startLabel = isDone
    ? "Wiederholen"
    : completedStepCount > 0
      ? "Fortsetzen"
      : "Starten";

  return (
    <li className={clsx("px-4 py-3", { "opacity-60": isDone })}>
      <p className="font-bold text-balance">{taskConfig.title}</p>
      <p className="text-sm text-neutral-500">{taskConfig.description}</p>

      <div className="flex items-center justify-between gap-2 mt-2">
        {isDone ? (
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            <FaCheckCircle className="text-green-500" />
            Erledigt
          </span>
        ) : (
          <span className="text-xs text-neutral-500">
            {completedStepCount} von {task.stepKeys.length} Schritten
          </span>
        )}

        <div className="flex gap-1">
          {!isDone && (
            <Button2
              type="button"
              variant={Button2Variant.Secondary}
              onClick={() => markTaskAsDone(task.key)}
              tooltip="Als erledigt markieren, ohne die Tour zu machen"
            >
              Überspringen
            </Button2>
          )}

          <Button2
            type="button"
            onClick={() => {
              startTour(task.key);
              closePopover();
            }}
          >
            {startLabel}
          </Button2>
        </div>
      </div>
    </li>
  );
};
