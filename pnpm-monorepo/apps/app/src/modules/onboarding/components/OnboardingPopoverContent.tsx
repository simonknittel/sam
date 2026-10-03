"use client";

import clsx from "clsx";
import { useState } from "react";
import { useOnboarding } from "./OnboardingProvider";
import { OnboardingTaskListItem } from "./OnboardingTaskListItem";

export const OnboardingPopoverContent = () => {
  const { eligibleTasks, completedTaskKeys, openTaskCount } = useOnboarding();

  /** Open tasks first, completed tasks at the end, config order in between */
  const orderedTasks = [
    ...eligibleTasks.filter((task) => !completedTaskKeys.has(task.key)),
    ...eligibleTasks.filter((task) => completedTaskKeys.has(task.key)),
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Lerne das SAM mit kurzen Touren kennen.
      </p>

      <ul
        className={clsx(
          /**
           * Same cap and scrolling as the notification center's list: the
           * popover keeps its height, the task list scrolls inside it.
           */
          "-mx-4 max-h-96 divide-y divide-neutral-800 overflow-y-auto border-t border-neutral-800",
          { "border-b": openTaskCount > 0, "-mb-4": openTaskCount === 0 },
        )}
      >
        {orderedTasks.map((task) => (
          <OnboardingTaskListItem key={task.key} task={task} />
        ))}
      </ul>

      {openTaskCount > 0 && <MarkAllTasksAsDoneButton />}
    </div>
  );
};

const MarkAllTasksAsDoneButton = () => {
  const { markAllTasksAsDone } = useOnboarding();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="cursor-pointer font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline active:text-interaction-300"
        >
          Alle als erledigt markieren
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 text-sm">
      <span>Wirklich alle als erledigt markieren?</span>

      <button
        type="button"
        onClick={() => {
          markAllTasksAsDone();
          setIsConfirming(false);
        }}
        className="cursor-pointer font-mono text-interaction-500 uppercase hover:underline focus-visible:underline active:text-interaction-300"
      >
        Ja
      </button>

      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        className="cursor-pointer font-mono text-neutral-500 uppercase hover:underline focus-visible:underline active:text-neutral-300"
      >
        Abbrechen
      </button>
    </div>
  );
};
