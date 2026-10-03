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
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <dt className="flex flex-none items-center gap-2 font-mono text-xs text-white/40 uppercase">
        {icon}
        {name}
      </dt>

      <dd className="flex min-w-0 items-baseline gap-2">{children}</dd>
    </div>
  );
};
