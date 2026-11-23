"use client";

import { SharingPopoverSection } from "./SharingPopoverSection";

/**
 * SLOT: the section "Settings of this browser" (see "Sharing popover" of
 * `docs/remote-control-program/README.md`). The next part of phase 7 fills it
 * with the hook API of the browser runtime: the autostart, the log folder,
 * the local access layer and the "Stop all" of this browser, and the note
 * when the browser needs a click to give the file access again.
 *
 * The section does not depend on the data of the server: the popover shows
 * it also while that data loads or when the read failed.
 */
export const BrowserSettingsSection = () => {
  return (
    <SharingPopoverSection heading="Dieser Browser">
      <p className="text-sm text-neutral-500">
        Hier folgen die Einstellungen der Laufzeit in diesem Browser.
      </p>
    </SharingPopoverSection>
  );
};
