import clsx from "clsx";
import { type ReactElement, type ReactNode } from "react";
import { SidebarContainer } from "./SidebarContainer";

interface Props {
  readonly className?: string;
  readonly sidebar: ReactElement;
  readonly childrenContainerClassName?: string;
  readonly children: ReactNode;
  /** Label of the toggle button shown on mobile. Defaults to "Filter". */
  readonly mobileToggleLabel?: string;
  /** Icon of the toggle button shown on mobile. Defaults to a filter icon. */
  readonly mobileToggleIcon?: ReactNode;
  /** Sidebar width class(es). Defaults to "md:w-64". */
  readonly sidebarWidthClassName?: string;
}

export const SidebarLayout = ({
  className,
  sidebar,
  childrenContainerClassName,
  children,
  mobileToggleLabel,
  mobileToggleIcon,
  sidebarWidthClassName = "md:w-64",
}: Props) => {
  return (
    <div className={clsx("flex flex-col md:flex-row gap-4", className)}>
      <SidebarContainer
        className={clsx("md:flex-none", sidebarWidthClassName)}
        mobileToggleLabel={mobileToggleLabel}
        mobileToggleIcon={mobileToggleIcon}
      >
        {sidebar}
      </SidebarContainer>

      <div className={clsx("md:flex-1 md:min-w-0", childrenContainerClassName)}>
        {children}
      </div>
    </div>
  );
};
