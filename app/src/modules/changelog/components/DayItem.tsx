import { SmallBadge } from "@/modules/common/components/SmallBadge";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly heading: ReactNode;
  readonly children: ReactNode;
  readonly badges?: string[];
  readonly isNew?: boolean;
}

export const DayItem = ({
  heading,
  badges = [],
  children,
  isNew = false,
}: Props) => {
  return (
    <li
      className={clsx("border-l pl-5 relative", {
        "border-l-transparent": isNew,
        "border-l-neutral-800/80": !isNew,
      })}
    >
      {isNew && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px"
          style={{
            background: "linear-gradient(to bottom, #f59e0b, transparent)",
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <strong className="block font-bold font-mono uppercase">
          {heading}
        </strong>

        {isNew && (
          <div className="bg-amber-500 text-black font-mono uppercase text-xs px-1 py-0.5">
            Neu
          </div>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {badges.map((badge, index) => (
            <SmallBadge key={index} value={badge} />
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </li>
  );
};
