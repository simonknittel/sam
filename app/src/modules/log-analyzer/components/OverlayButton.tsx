"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { useEffect, type MouseEventHandler } from "react";
import { FaRegWindowRestore } from "react-icons/fa";
import { EntryType, type IEntry } from "./Entry";
import styles from "./Entry.module.css";
import { useOverlay } from "./OverlayContext";
import { OverlayWindow } from "./OverlayWindow";

interface Props {
  readonly className?: string;
  readonly entries: IEntry[];
}

export const OverlayButton = ({ className, entries }: Props) => {
  const { isSupported, requestPipWindow, pipWindow, closePipWindow } =
    useOverlay();

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

  const newEntries = entries
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
                Neue Kills aus dieser Session werden hier angezeigt.
              </div>
            )}
          </section>
        </OverlayWindow>
      )}
    </>
  );
};

interface OverlayEntryProps {
  readonly entry: IEntry;
}

const OverlayEntry = ({ entry }: OverlayEntryProps) => {
  return (
    <div className={clsx("relative", styles.Row)}>
      <div className="whitespace-nowrap overflow-hidden">
        {/* {entry.type === EntryType.Kill && (
          <>
            <div
              className="max-w-32 truncate inline-block align-middle"
              title={entry.killer}
            >
              <RSILink handle={entry.killer} />
            </div>

            <div className="inline-block align-middle">killed</div>

            <div
              className="max-w-32 truncate inline-block align-middle"
              title={entry.target}
            >
              <RSILink handle={entry.target} />
            </div>
          </>
        )} */}

        {/* {entry.type === EntryType.Corpse && (
          <>
            <div className="inline-block align-middle pl-2">Leiche von</div>

            <div
              className="max-w-32 truncate inline-block align-middle"
              title={entry.target}
            >
              <RSILink handle={entry.target} />
            </div>

            <div className="inline-block align-middle">entdeckt</div>
          </>
        )} */}

        {entry.type === EntryType.JoinPu && (
          <div className="px-2">
            Shard <span className="text-neutral-500">{entry.shard}</span>{" "}
            beigetreten
          </div>
        )}

        {/* {entry.type === EntryType.ContestedZoneElevator && (
          <div className="px-2">
            Aufzug (Contested Zone){" "}
            <span className="text-neutral-500">{entry.elevatorName}</span>{" "}
            benutzt
          </div>
        )} */}

        {/* {entry.type === EntryType.AsdElevator && (
          <div className="px-2">
            Aufzug (ASD){" "}
            <span className="text-neutral-500">{entry.elevatorName}</span>{" "}
            benutzt
          </div>
        )} */}

        {entry.type === EntryType.OwnDeath && (
          <div className="px-2">Gestorben</div>
        )}
      </div>

      <div
        className={clsx(
          "absolute left-0 top-0 bg-amber-500 text-black uppercase text-xs px-1 rounded-br-secondary",
          styles.New,
        )}
      >
        Neu
      </div>
    </div>
  );
};
