"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { useCmdKContext } from "./CmdKContext";

const CmdK = dynamic(
  () => import("./CmdKDialog").then((mod) => mod.CmdKDialog),
  {
    ssr: false,
  },
);

interface Props {
  readonly className?: string;
}

export const CmdKLoader = ({ className }: Props) => {
  const { open, setOpen } = useCmdKContext();

  /**
   * The dialog and its chunk load only when the palette opens for the first
   * time, not on each page. After that, the dialog stays mounted.
   */
  const [isDialogMounted, setIsDialogMounted] = useState(open);
  if (open && !isDialogMounted) setIsDialogMounted(true);

  return (
    <>
      <div className={clsx("p-2", className)}>
        <button
          className="group flex h-full w-full cursor-pointer justify-between rounded-secondary border border-neutral-700 bg-neutral-800 px-2 py-1 text-center text-sm text-neutral-600 hover:text-neutral-400 focus-visible:text-neutral-400 active:text-neutral-300"
          type="button"
          onClick={() => setOpen(true)}
        >
          Suche ...
          <span className="rounded-secondary border border-neutral-700 px-1 py-0.5 font-mono text-xs uppercase group-hover:border-neutral-600 group-active:border-neutral-500">
            Strg + K
          </span>
        </button>
      </div>

      {isDialogMounted && (
        <Suspense>
          <CmdK />
        </Suspense>
      )}
    </>
  );
};
