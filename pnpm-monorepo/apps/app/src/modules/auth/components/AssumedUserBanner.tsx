"use client";

import { runActionAndReload } from "@/modules/actions/utils/runActionAndReload";
import { useTransition } from "react";
import { stopAssumingUser } from "../actions/stopAssumingUser";

interface Props {
  readonly assumedUserLabel: string;
}

export const AssumedUserBanner = ({ assumedUserLabel }: Props) => {
  const [isPending, startTransition] = useTransition();

  const handleExit = () => {
    startTransition(() => runActionAndReload(stopAssumingUser, new FormData()));
  };

  return (
    <div className="flex min-w-0 items-center gap-4 backdrop-blur-sm px-2 py-1 rounded-secondary bg-red-500/50 text-xs font-mono uppercase">
      <p className="min-w-0 truncate" title={assumedUserLabel}>
        Assuming {assumedUserLabel}
      </p>

      <button
        type="button"
        className="whitespace-nowrap enabled:hover:underline enabled:focus-visible:underline enabled:active:underline enabled:cursor-pointer disabled:opacity-50"
        onClick={handleExit}
        disabled={isPending}
      >
        Exit
      </button>
    </div>
  );
};
