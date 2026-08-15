"use client";

import clsx from "clsx";
import { AssumedUserBanner } from "./AssumedUserBanner";
import { AssumeUserButton } from "./AssumeUserButton";

interface Props {
  readonly className?: string;
  readonly enabled?: boolean;
  readonly assumedUserLabel?: string;
}

export const AdminEnabler = ({
  className,
  enabled = false,
  assumedUserLabel,
}: Props) => {
  return (
    <div
      className={clsx(
        "fixed top-2 left-1/2 -translate-x-1/2 z-50 flex max-w-xs gap-2",
        className,
      )}
    >
      {assumedUserLabel ? (
        <AssumedUserBanner assumedUserLabel={assumedUserLabel} />
      ) : (
        <>
          <EnableAdminButton enabled={enabled} />
          <AssumeUserButton />
        </>
      )}
    </div>
  );
};

interface EnableAdminButtonProps {
  readonly enabled: boolean;
}

const EnableAdminButton = ({ enabled }: EnableAdminButtonProps) => {
  const handleClick = () => {
    if (enabled) {
      document.cookie = `enable_admin=; path=/; samesite=lax; max-age=0;`;
    } else {
      document.cookie = `enable_admin=1; path=/; samesite=lax; max-age=${60 * 60 * 24 * 7};`;
    }

    // Full reload instead of router.refresh(): a page rendered through the
    // forbidden() boundary is not re-rendered by a refresh and would stay
    // redacted after enabling
    window.location.reload();
  };

  return (
    <button
      type="button"
      className={clsx(
        "backdrop-blur-sm px-2 py-1 rounded-secondary transition-colors motion-reduce:transition-none whitespace-nowrap text-xs font-mono uppercase cursor-pointer",
        {
          "bg-green-500/50 hover:bg-green-500 focus-visible:bg-green-500 active:bg-green-400":
            !enabled,
          "bg-red-500/50 hover:bg-red-500 focus-visible:bg-red-500 active:bg-red-400":
            enabled,
        },
      )}
      onClick={handleClick}
    >
      {enabled ? "Disable" : "Enable"} admin
    </button>
  );
};
