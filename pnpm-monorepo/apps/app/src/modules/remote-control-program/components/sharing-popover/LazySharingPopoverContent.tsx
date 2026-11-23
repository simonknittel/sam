"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import dynamic from "next/dynamic";

/**
 * `SharingPopoverContent` with its own chunk: the shell is on each page, and
 * the content (the forms and the presentation of the log entry types) loads
 * only when the popover opens for the first time.
 */
export const LazySharingPopoverContent = dynamic(
  () =>
    import("./SharingPopoverContent").then(
      (module) => module.SharingPopoverContent,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="flex items-center gap-2 text-sm text-neutral-500">
        <AsciiSpinner />
        Lade …
      </p>
    ),
  },
);
