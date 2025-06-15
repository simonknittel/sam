import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly heading: ReactNode;
  readonly cta?: ReactNode;
  readonly children: ReactNode;
  readonly childrenClassName?: string;
}

export const Tile = ({
  className,
  cta,
  heading,
  children,
  childrenClassName,
}: Props) => {
  return (
    <section
      className={clsx("rounded-primary background-secondary", className)}
    >
      <div className="flex justify-between items-center border-b border-white/5">
        <h2 className="font-thin text-2xl p-4 lg:px-6 flex-1">{heading}</h2>

        {cta && <div className="pr-4 lg:pr-6 flex-initial">{cta}</div>}
      </div>

      <div className={clsx("p-4 lg:p-6", childrenClassName)}>{children}</div>
    </section>
  );
};
