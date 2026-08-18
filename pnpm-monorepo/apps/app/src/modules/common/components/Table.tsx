import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface TableProps {
  readonly className?: string;
  /**
   * Class(es) for the `<table>` itself. Mainly an escape hatch for
   * breakpoint-specific column sets: redefining the columns custom property
   * here sits closer to the cells than the wrapper below and therefore wins.
   */
  readonly tableClassName?: string;
  /**
   * The `grid-template-columns` value shared by the head and every row, e.g.
   * `"150px 250px minmax(280px,1fr)"`. It travels as a custom property rather
   * than a class so it is declared once here instead of being threaded into
   * the head and every row — a React context would not do, since most tables
   * are built in server components.
   */
  readonly columns: string;
  /** Width in pixels the table never falls below; the wrapper scrolls instead. */
  readonly minWidth?: number;
  readonly children: ReactNode;
}

export const Table = ({
  className,
  tableClassName,
  columns,
  minWidth,
  children,
}: TableProps) => {
  return (
    <div
      className={clsx("w-full overflow-x-auto", className)}
      style={{ "--table-columns": columns } satisfies CSSProperties}
    >
      <table
        className={clsx("w-full", tableClassName)}
        style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
      >
        {children}
      </table>
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
          "border-b border-white/20 text-left grid grid-cols-(--table-columns) gap-2 uppercase font-mono [&>th]:font-normal text-white/40 whitespace-nowrap pb-2 items-center text-sm",
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
        "grid grid-cols-(--table-columns) items-center gap-2 border-t border-white/5 py-1 hover:bg-white/5",
        className,
      )}
    >
      {children}
    </tr>
  );
};
