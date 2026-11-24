import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly heading: string;
  readonly lead?: ReactNode;
  readonly children: ReactNode;
}

export const GuideSection = ({ className, heading, lead, children }: Props) => {
  return (
    <section className={clsx(className)}>
      <h3 className="flex items-center gap-3 font-mono text-lg font-bold uppercase">
        <span
          aria-hidden
          className="h-5 w-1 flex-none rounded-full bg-brand-red-500"
        />
        {heading}
      </h3>

      {lead && <p className="mt-1 ml-4 text-sm text-white/60">{lead}</p>}

      <div className="mt-4">{children}</div>
    </section>
  );
};
