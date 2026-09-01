"use client";

import clsx from "clsx";
import { useWikiPagePermissionsOpener } from "./WikiPagePermissionsOpener";

interface Props {
  /** Who may read the page, e.g. `alle` or `3 Rollen` */
  readonly label: string;
}

/**
 * Brighter than the rest of the metadata line on purpose — an author has to
 * be able to read how wide the audience of the text is at a glance.
 */
const BADGE_CLASSES =
  "rounded-secondary bg-white/5 px-1.5 py-0.5 text-white/60";

/**
 * Who may read this page, in the metadata line of the page header. Every
 * reader sees it; whoever may change the setting opens the permissions
 * dialog from here, next to the lock button they already know.
 */
export const WikiPageVisibilityBadge = ({ label }: Props) => {
  const openPermissions = useWikiPagePermissionsOpener();

  const content = (
    <>
      <span className="uppercase font-mono">Sichtbar für:</span> {label}
    </>
  );

  if (!openPermissions) return <span className={BADGE_CLASSES}>{content}</span>;

  return (
    <button
      type="button"
      onClick={openPermissions}
      className={clsx(
        BADGE_CLASSES,
        "cursor-pointer transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 outline-offset-2 outline-interaction-700 active:text-white/80 motion-reduce:transition-none",
      )}
    >
      {content}
      <span className="sr-only"> – Berechtigungen öffnen</span>
    </button>
  );
};
