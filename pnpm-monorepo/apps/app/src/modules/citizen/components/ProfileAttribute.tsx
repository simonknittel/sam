import type { ReactNode } from "react";

interface Props {
  /** Shown in front of the name, for example the Discord logo */
  readonly icon?: ReactNode;
  readonly name: string;
  readonly children: ReactNode;
}

/**
 * One name/value pair of a citizen, shown identically on each surface which
 * describes a citizen: the popover, the dashboard tile and the Spynet
 * overview. The name stays on the left, the value follows on the right.
 */
export const ProfileAttribute = ({ icon, name, children }: Props) => {
  return (
    <div className="flex gap-4 justify-between items-baseline min-w-0">
      <dt className="flex-none flex gap-2 items-center text-white/40 font-mono uppercase text-xs">
        {icon}
        {name}
      </dt>

      <dd className="flex gap-2 items-baseline min-w-0">{children}</dd>
    </div>
  );
};
