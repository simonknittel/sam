"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useEffect, useEffectEvent, type MouseEventHandler } from "react";
import { FaRegWindowRestore } from "react-icons/fa";
import { collapseRepeatedEntries } from "../utils/collapseRepeatedEntries";
import { compareEntriesNewestFirst } from "../utils/compareEntries";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { useOverlay } from "./OverlayContext";
import { OverlayEntry } from "./OverlayEntry";
import { OverlayWindow } from "./OverlayWindow";

/**
 * The entries since the open of the Log Analyzer are new. The small overlay
 * shows only the newest of them.
 */
const MAXIMUM_OVERLAY_ENTRIES = 200;

interface Props {
  readonly className?: string;
}

export const OverlayButton = ({ className }: Props) => {
  const { isSupported, requestPipWindow, pipWindow, closePipWindow } =
    useOverlay();

  const { entries, entryFilterFn } = useLogAnalyzerContext();

  /**
   * The overlay closes only when the button unmounts. A cleanup with
   * `closePipWindow` as dependency would also close it each time that
   * function changes.
   */
  const closeOverlayOnUnmount = useEffectEvent(() => {
    closePipWindow();
  });

  useEffect(() => {
    return () => {
      closeOverlayOnUnmount();
    };
  }, []);

  if (!isSupported) return null;

  const handleToggleOverlay: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    if (pipWindow) {
      closePipWindow();
    } else {
      void requestPipWindow();
    }
  };

  /** The repeats collapse before the pick of the new entries, so that a
      repeat of an older entry does not show as new. The filters of the types
      come after them (see `collapseRepeatedEntries`). */
  const newEntries = collapseRepeatedEntries(
    entries.toSorted(compareEntriesNewestFirst),
  )
    .filter((entry) => entry.isNew && entryFilterFn(entry))
    .slice(0, MAXIMUM_OVERLAY_ENTRIES);

  return (
    <>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={handleToggleOverlay}
        className={className}
      >
        <FaRegWindowRestore />
        Overlay
      </Button2>

      {pipWindow && (
        <OverlayWindow pipWindow={pipWindow}>
          <section className="flex min-h-dvh flex-col gap-1 background-primary p-2 text-text-primary">
            {newEntries.length > 0 ? (
              newEntries.map((entry) => (
                <OverlayEntry key={entry.key} entry={entry} />
              ))
            ) : (
              <div className="p-2 text-center text-sm text-neutral-500">
                Neue Einträge seit dem Öffnen des Log Analyzers erscheinen hier.
              </div>
            )}
          </section>
        </OverlayWindow>
      )}
    </>
  );
};
