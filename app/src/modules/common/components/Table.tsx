import clsx from "clsx";
import type { ReactNode } from "react";

interface THeadProps {
  readonly className?: string;
  readonly children: ReactNode;
}

export const THead = ({ className, children }: THeadProps) => {
  return (
    <thead>
      <tr
        className={clsx(
          "border-b border-white/20 text-left grid gap-2 uppercase font-mono [&>th]:font-normal text-white/40 whitespace-nowrap pb-2 items-center text-sm",
          className,
        )}
      >
        {children}
      </tr>
    </thead>
  );
};

interface TRowProps {
  readonly className?: string;
  readonly children: ReactNode;
}

export const TRow = ({ className, children }: TRowProps) => {
  return (
    <tr
      className={clsx(
        "grid items-center gap-2 border-t border-white/5 py-1 hover:bg-white/5",
        className,
      )}
    >
      {children}
    </tr>
  );
};
