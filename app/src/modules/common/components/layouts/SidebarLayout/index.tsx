import clsx from "clsx";
import { cloneElement, type ReactElement, type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly sidebar: ReactElement;
  readonly childrenContainerClassName?: string;
  readonly children: ReactNode;
}

export const SidebarLayout = ({
  className,
  sidebar,
  childrenContainerClassName,
  children,
}: Props) => {
  const _sidebar = cloneElement(sidebar, {
    // @ts-expect-error
    className: "md:w-64 md:flex-none",
  });

  return (
    <div className={clsx("flex flex-col md:flex-row gap-4", className)}>
      {_sidebar}

      <div className={clsx("md:flex-1 md:min-w-0", childrenContainerClassName)}>
        {children}
      </div>
    </div>
  );
};
