import clsx from "clsx";
import type { ReactNode } from "react";

interface TableProps {
  readonly className?: string;
  readonly tableClassName?: string;
  readonly children: ReactNode;
}

export const Table = ({ className, tableClassName, children }: TableProps) => {
  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <table className={clsx("w-full", tableClassName)}>{children}</table>
    </div>
  );
};

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

interface TBodyProps {
  readonly className?: string;
  readonly children: ReactNode;
}

export const TBody = ({ className, children }: TBodyProps) => {
  return <tbody className={clsx(className)}>{children}</tbody>;
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
