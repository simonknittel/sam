import clsx from "clsx";
import type { ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FaBookOpen } from "react-icons/fa6";

interface Props {
  readonly className?: string;
  readonly subtitle: string;
  readonly children: ReactNode;
}

/** Starts closed, so that the app stays at the top of the page */
export const Guide = ({ className, subtitle, children }: Props) => {
  return (
    <details className={clsx("group rounded-primary bg-secondary", className)}>
      {/* A summary takes a heading, but no block around it, thus the grid
          places the heading and the line below it */}
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-primary p-4 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10 [&::-webkit-details-marker]:hidden">
        <span className="row-span-2 flex size-10 items-center justify-center rounded-secondary bg-brand-red-500/15 text-brand-red-300">
          <FaBookOpen aria-hidden />
        </span>

        <h2 className="font-mono text-lg font-bold uppercase">Anleitung</h2>

        <FaChevronDown
          aria-hidden
          className="row-span-2 text-brand-red-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />

        <span className="col-start-2 text-sm text-white/60">{subtitle}</span>
      </summary>

      <div className="flex flex-col gap-12 border-t border-white/5 p-4 lg:p-8">
        {children}
      </div>
    </details>
  );
};
