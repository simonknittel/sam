"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useEffect, type MouseEventHandler } from "react";
import { FaRegWindowRestore } from "react-icons/fa";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { useOverlay } from "./OverlayContext";
import { OverlayEntry } from "./OverlayEntry";
import { OverlayWindow } from "./OverlayWindow";

interface Props {
  readonly className?: string;
}

export const OverlayButton = ({ className }: Props) => {
  const { isSupported, requestPipWindow, pipWindow, closePipWindow } =
    useOverlay();

  const { entries, entryFilterFn } = useLogAnalyzerContext();

  useEffect(() => {
    return () => {
      closePipWindow();
    };
  }, [closePipWindow]);

  if (!isSupported) return null;

  const handleToggleOverlay: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    if (pipWindow) {
      closePipWindow();
    } else {
      void requestPipWindow();
    }
  };

  const newEntries = Array.from(entries.values().filter(entryFilterFn))
    .filter((entry) => entry.isNew)
    .toSorted((a, b) => b.isoDate.getTime() - a.isoDate.getTime());

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
          <section className="min-h-dvh background-primary text-text-primary p-2 flex flex-col gap-1">
            {newEntries.length > 0 ? (
              newEntries.map((entry) => (
                <OverlayEntry key={entry.key} entry={entry} />
              ))
            ) : (
              <div className="text-center text-neutral-500 p-2 text-sm">
                Neue Logs aus der aktuellen Session werden hier angezeigt.
              </div>
            )}
          </section>
        </OverlayWindow>
      )}
    </>
  );
};
