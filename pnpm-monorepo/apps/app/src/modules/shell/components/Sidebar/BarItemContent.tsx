import { UnreadDot } from "@/modules/common/components/UnreadDot";
import type { ReactNode } from "react";

export const barItemClassName =
  "flex h-full w-full flex-col items-center justify-center rounded-secondary hover:bg-neutral-700 focus-visible:bg-neutral-700 active:bg-neutral-600";

interface Props {
  readonly icon: ReactNode;
  readonly label: string;
  readonly hasUnreadDot?: boolean;
}

export const BarItemContent = ({
  icon,
  label,
  hasUnreadDot = false,
}: Props) => {
  return (
    <>
      <span className="relative text-xl text-neutral-500">
        {icon}

        {hasUnreadDot && (
          <span className="absolute -top-0.5 -right-1.5 flex">
            <UnreadDot />
          </span>
        )}
      </span>

      <span className="text-xs">{label}</span>
    </>
  );
};
