import { SmallBadge } from "@/modules/common/components/SmallBadge";
import type { ReactNode } from "react";

interface Props {
  readonly heading: ReactNode;
  readonly children: ReactNode;
  readonly badges?: string[];
}

export const DayItem = ({ heading, badges = [], children }: Props) => {
  return (
    <li className="border-l-2 border-neutral-800/80 pl-5">
      <strong className="block font-bold font-mono uppercase">{heading}</strong>

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
