import type { ReactNode } from "react";

interface Props {
  readonly icon?: ReactNode;
  readonly name: string;
  readonly children: ReactNode;
}

/** The variant popover uses it too, thus both popovers look the same */
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
