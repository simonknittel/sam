"use client";

import clsx from "clsx";
import { useWikiPagePermissionsOpener } from "./WikiPagePermissionsOpener";

interface Props {
  /** Who may read the page, e.g. `alle` or `ausgewählte Rollen` */
  readonly label: string;
}

/**
 * Brighter than the rest of the metadata line on purpose — an author has to
 * be able to read how wide the audience of the text is at a glance.
 */
const BADGE_CLASSES =
  "rounded-secondary bg-white/5 px-1.5 py-0.5 text-white/60";

export const WikiPageReadAudienceBadge = ({ label }: Props) => {
  const openPermissions = useWikiPagePermissionsOpener();

  const content = (
    <>
      <span className="font-mono uppercase">Sichtbar für:</span> {label}
    </>
  );

  if (!openPermissions) return <span className={BADGE_CLASSES}>{content}</span>;

  return (
    <button
      type="button"
      onClick={openPermissions}
      className={clsx(
        BADGE_CLASSES,
        "cursor-pointer outline-offset-2 outline-interaction-700 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 active:text-white/80",
      )}
    >
      {content}
      <span className="sr-only"> – Berechtigungen öffnen</span>
    </button>
  );
};
