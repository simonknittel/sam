"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";

interface Props {
  readonly className?: string;
  readonly enabled?: boolean;
}

export const AdminEnabler = ({ className, enabled = false }: Props) => {
  const router = useRouter();

  const handleClick = () => {
    if (enabled) {
      document.cookie = `enable_admin=; path=/; max-age=0;`;
    } else {
      document.cookie = `enable_admin=1; path=/; max-age=${60 * 60 * 24 * 7};`;
    }

    router.refresh();
  };

  return (
    <button
      className={clsx(
        "fixed top-2 left-1/2 -translate-x-1/2 backdrop-blur z-50 max-w-xs px-2 py-1 rounded-secondary gap-4 justify-between transition-colors whitespace-nowrap text-xs font-mono uppercase",
        {
          "bg-green-500/50 hover:bg-green-500/100": !enabled,
          "bg-red-500/50 hover:bg-red-500/100": enabled,
        },
        className,
      )}
      onClick={handleClick}
    >
      {enabled ? "Disable" : "Enable"} admin
    </button>
  );
};
