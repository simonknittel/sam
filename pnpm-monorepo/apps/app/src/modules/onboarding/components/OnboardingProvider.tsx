"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { OnboardingTaskCompletionMethod } from "@sam-monorepo/database/browser";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { completeOnboardingStep } from "../actions/completeOnboardingStep";
import { completeOnboardingTask } from "../actions/completeOnboardingTask";
import { skipAllOnboardingTasks } from "../actions/skipAllOnboardingTasks";
import type { OnboardingTaskKey } from "../utils/config";
import {
  encodeOnboardingStepProgressKey,
  type EligibleOnboardingTask,
  type OnboardingState,
} from "../utils/types";

export interface ActiveOnboardingTour {
  readonly taskKey: OnboardingTaskKey;
  /** Index into the eligible steps of the task */
  readonly stepIndex: number;
}

interface OnboardingContext {
  readonly eligibleTasks: readonly EligibleOnboardingTask[];
  readonly completedTaskKeys: ReadonlySet<string>;
  /** Encoded with `encodeOnboardingStepProgressKey()` */
  readonly completedStepProgressKeys: ReadonlySet<string>;
  readonly openTaskCount: number;
  readonly activeTour: ActiveOnboardingTour | null;
  readonly startTour: (taskKey: OnboardingTaskKey) => void;
  /** Stamps the current step and moves to the next one or finishes the task */
  readonly advanceTour: () => void;
  readonly retreatTour: () => void;
  readonly exitTour: () => void;
  readonly markTaskAsDone: (taskKey: OnboardingTaskKey) => void;
  readonly markAllTasksAsDone: () => void;
}

const OnboardingContext = createContext<OnboardingContext | undefined>(
  undefined,
);

interface Props {
  /** Null for sessions without a citizen — they never see the feature */
  readonly initialState: OnboardingState | null;
  readonly children: ReactNode;
}

export const OnboardingProvider = ({ initialState, children }: Props) => {
  const eligibleTasks = useMemo(
    () => initialState?.eligibleTasks ?? [],
    [initialState?.eligibleTasks],
  );
  const serverCompletedTaskKeys = useMemo(
    () => initialState?.completedTaskKeys ?? [],
    [initialState?.completedTaskKeys],
  );
  const serverCompletedStepProgressKeys = useMemo(
    () => initialState?.completedStepProgressKeys ?? [],
    [initialState?.completedStepProgressKeys],
  );

  /**
   * Completing or skipping deliberately doesn't revalidate the layout, which
   * would re-render the whole shell underneath an open popover. The
   * optimistic state lives here instead (same pattern as the apps context).
   * Progress rows only ever get added, so whenever the server sends a new
   * set, it is merged into the local one instead of replacing it.
   */
  const [completedTaskKeys, setCompletedTaskKeys] = useState(
    () => new Set(serverCompletedTaskKeys),
  );
  const [completedStepProgressKeys, setCompletedStepProgressKeys] = useState(
    () => new Set(serverCompletedStepProgressKeys),
  );

  const serverSignature = [
    serverCompletedTaskKeys.toSorted().join(","),
    serverCompletedStepProgressKeys.toSorted().join(","),
  ].join("|");
  const [renderedSignature, setRenderedSignature] = useState(serverSignature);

  if (renderedSignature !== serverSignature) {
    setRenderedSignature(serverSignature);
    setCompletedTaskKeys(
      (previousKeys) => new Set([...previousKeys, ...serverCompletedTaskKeys]),
    );
    setCompletedStepProgressKeys(
      (previousKeys) =>
        new Set([...previousKeys, ...serverCompletedStepProgressKeys]),
    );
  }

  const [activeTour, setActiveTour] = useState<ActiveOnboardingTour | null>(
    null,
  );

  const completeTask = useCallback(
    (taskKey: OnboardingTaskKey, method: OnboardingTaskCompletionMethod) => {
      setCompletedTaskKeys(
        (previousKeys) => new Set([...previousKeys, taskKey]),
      );

      const formData = new FormData();
      formData.append("taskKey", taskKey);
      formData.append("completionMethod", method);
      void runAction(completeOnboardingTask, formData);
    },
    [],
  );

  const startTour = useCallback(
    (taskKey: OnboardingTaskKey) => {
      const task = eligibleTasks.find(
        (taskCandidate) => taskCandidate.key === taskKey,
      );
      if (!task) return;

      /** A replay of a completed task starts from the beginning */
      const isReplay = completedTaskKeys.has(taskKey);

      const firstIncompleteIndex = task.stepKeys.findIndex(
        (stepKey) =>
          !completedStepProgressKeys.has(
            encodeOnboardingStepProgressKey(taskKey, stepKey),
          ),
      );

      /**
       * All steps stamped but the task not finished (e.g. exited on the last
       * step): resume at the last step so the task can still be finished.
       */
      const resumeIndex =
        firstIncompleteIndex === -1
          ? task.stepKeys.length - 1
          : firstIncompleteIndex;

      setActiveTour({
        taskKey,
        stepIndex: isReplay ? 0 : resumeIndex,
      });
    },
    [eligibleTasks, completedTaskKeys, completedStepProgressKeys],
  );

  const advanceTour = useCallback(() => {
    if (!activeTour) return;

    const task = eligibleTasks.find(
      (taskCandidate) => taskCandidate.key === activeTour.taskKey,
    );
    if (!task) {
      setActiveTour(null);
      return;
    }

    const currentStepKey = task.stepKeys[activeTour.stepIndex];

    if (currentStepKey) {
      setCompletedStepProgressKeys(
        (previousKeys) =>
          new Set([
            ...previousKeys,
            encodeOnboardingStepProgressKey(activeTour.taskKey, currentStepKey),
          ]),
      );

      const formData = new FormData();
      formData.append("taskKey", activeTour.taskKey);
      formData.append("stepKey", currentStepKey);
      void runAction(completeOnboardingStep, formData, {
        successToast: false,
      });
    }

    const isLastStep = activeTour.stepIndex >= task.stepKeys.length - 1;
    if (isLastStep) {
      completeTask(activeTour.taskKey, OnboardingTaskCompletionMethod.TOUR);
      setActiveTour(null);
      return;
    }

    setActiveTour({ ...activeTour, stepIndex: activeTour.stepIndex + 1 });
  }, [activeTour, eligibleTasks, completeTask]);

  const retreatTour = useCallback(() => {
    setActiveTour((currentTour) =>
      currentTour && currentTour.stepIndex > 0
        ? { ...currentTour, stepIndex: currentTour.stepIndex - 1 }
        : currentTour,
    );
  }, []);

  const exitTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  const markTaskAsDone = useCallback(
    (taskKey: OnboardingTaskKey) => {
      completeTask(taskKey, OnboardingTaskCompletionMethod.SKIPPED);
    },
    [completeTask],
  );

  const markAllTasksAsDone = useCallback(() => {
    setCompletedTaskKeys(
      (previousKeys) =>
        new Set([...previousKeys, ...eligibleTasks.map((task) => task.key)]),
    );

    void runAction(skipAllOnboardingTasks, new FormData());
  }, [eligibleTasks]);

  const openTaskCount = eligibleTasks.filter(
    (task) => !completedTaskKeys.has(task.key),
  ).length;

  const value = useMemo(
    () => ({
      eligibleTasks,
      completedTaskKeys,
      completedStepProgressKeys,
      openTaskCount,
      activeTour,
      startTour,
      advanceTour,
      retreatTour,
      exitTour,
      markTaskAsDone,
      markAllTasksAsDone,
    }),
    [
      eligibleTasks,
      completedTaskKeys,
      completedStepProgressKeys,
      openTaskCount,
      activeTour,
      startTour,
      advanceTour,
      retreatTour,
      exitTour,
      markTaskAsDone,
      markAllTasksAsDone,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("[OnboardingContext] Provider is missing!");
  return context;
}
