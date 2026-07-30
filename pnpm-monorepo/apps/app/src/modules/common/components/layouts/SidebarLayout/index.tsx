import clsx from "clsx";
import { type ReactElement, type ReactNode } from "react";
import { SidebarContainer } from "./SidebarContainer";

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
  return (
    <div className={clsx("flex flex-col md:flex-row gap-4", className)}>
      <SidebarContainer className="md:w-64 md:flex-none">
        {sidebar}
      </SidebarContainer>

      <div className={clsx("md:flex-1 md:min-w-0", childrenContainerClassName)}>
        {children}
      </div>
    </div>
  );
};
