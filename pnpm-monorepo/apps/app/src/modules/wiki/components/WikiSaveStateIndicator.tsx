"use client";

import { Tooltip } from "@/modules/common/components/Tooltip";
import { WikiSaveState } from "@sam-monorepo/wiki-editor";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FaCheck, FaSave, FaSpinner } from "react-icons/fa";

const STATE_CONFIG: Record<
  WikiSaveState,
  { label: string; description: string; icon: IconType; iconClassName: string }
> = {
  [WikiSaveState.Dirty]: {
    label: "Ungespeicherte Änderungen",
    description: "Die Änderungen werden automatisch gespeichert.",
    icon: FaSave,
    iconClassName: "text-amber-400",
  },
  [WikiSaveState.Saving]: {
    label: "Speichert …",
    description: "Die Änderungen werden gerade gespeichert.",
    icon: FaSpinner,
    iconClassName: "animate-spin text-neutral-300",
  },
  [WikiSaveState.Saved]: {
    label: "Gespeichert",
    description: "Alle Änderungen wurden gespeichert.",
    icon: FaCheck,
    iconClassName: "text-neutral-500",
  },
};

/**
 * Once "saving" appears it stays visible for at least this long — a store
 * usually completes within a few milliseconds, and an instant dirty →
 * saved swap reads as if nothing happened.
 */
const MIN_SAVING_DISPLAY_MS = 500;

/**
 * Mirrors the state, except that a saving → saved transition is delayed
 * until the minimum display duration has passed. Only that calming
 * transition is held back — a switch to "dirty" (new edits, failed save)
 * shows immediately.
 */
/* eslint-disable react-you-might-not-need-an-effect/no-event-handler, react-you-might-not-need-an-effect/no-derived-state -- Deliberate time-based smoothing: the displayed state must lag the actual state by a timer, which requires an effect and mirrored state. */
const useMinimumSavingDisplay = (state: WikiSaveState): WikiSaveState => {
  const [displayState, setDisplayState] = useState(state);
  const savingSince = useRef<number | null>(null);

  useEffect(() => {
    if (state === WikiSaveState.Saving) savingSince.current = Date.now();

    const remaining =
      state === WikiSaveState.Saved && savingSince.current !== null
        ? MIN_SAVING_DISPLAY_MS - (Date.now() - savingSince.current)
        : 0;
    if (state !== WikiSaveState.Saving) savingSince.current = null;

    if (remaining > 0) {
      const timer = setTimeout(
        () => setDisplayState(WikiSaveState.Saved),
        remaining,
      );
      return () => clearTimeout(timer);
    }

    setDisplayState(state);
  }, [state]);

  return displayState;
};
/* eslint-enable react-you-might-not-need-an-effect/no-event-handler, react-you-might-not-need-an-effect/no-derived-state */

interface Props {
  readonly className?: string;
  readonly state: WikiSaveState;
  /** Blocks the force save, e.g. while the collab connection is down */
  readonly disabled?: boolean;
  readonly onForceSave: () => void;
}

/**
 * Save state icon in the editor toolbar (amber save icon: unsaved changes,
 * spinner: saving, check: saved) with a hover popover explaining the
 * state. Clicking the save icon saves immediately instead of waiting for
 * the autosave. The button is never `disabled` — a disabled element gets
 * no pointer events, and the popover must open in every state — so
 * non-actionable states drop the click handler and set aria-disabled.
 */
export const WikiSaveStateIndicator = ({
  className,
  state,
  disabled = false,
  onForceSave,
}: Props) => {
  const displayState = useMinimumSavingDisplay(state);
  const config = STATE_CONFIG[displayState];
  const Icon = config.icon;
  const canForceSave =
    state === WikiSaveState.Dirty &&
    displayState === WikiSaveState.Dirty &&
    !disabled;

  return (
    <Tooltip
      asChild
      triggerChildren={
        <button
          type="button"
          aria-label={config.label}
          aria-disabled={!canForceSave}
          onClick={canForceSave ? onForceSave : undefined}
          className={clsx(
            "flex size-8 items-center justify-center rounded-secondary",
            { "cursor-pointer hover:bg-neutral-800": canForceSave },
            className,
          )}
        >
          <Icon className={config.iconClassName} />
        </button>
      }
    >
      <p className="font-bold">{config.label}</p>
      <p>
        {config.description}
        {canForceSave && " Klicken, um sofort zu speichern."}
      </p>
    </Tooltip>
  );
};
