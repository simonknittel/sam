"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { Suspense } from "react";
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
  const { setOpen } = useCmdKContext();

  return (
    <>
      <div className={clsx("p-2", className)}>
        <button
          className="flex justify-between w-full h-full rounded-secondary py-1 px-2 border border-neutral-700 bg-neutral-800 text-neutral-600 text-center text-sm hover:text-neutral-400 focus-visible:text-neutral-400 active:text-neutral-300 group"
          type="button"
          onClick={() => setOpen(true)}
        >
          Suche ...
          <span className="px-1 py-0.5 rounded-secondary border border-neutral-700 group-hover:border-neutral-600 group-active:border-neutral-500 text-xs font-mono uppercase">
            Strg + K
          </span>
        </button>
      </div>

      <Suspense>
        <CmdK />
      </Suspense>
    </>
  );
};
