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
  /**
   * The sidebar stays in view while the page scrolls, below the fixed bar of
   * the shell. A sidebar that is higher than the window scrolls on its own.
   */
  readonly isSticky?: boolean;
}

export const SidebarLayout = ({
  className,
  sidebar,
  childrenContainerClassName,
  children,
  mobileToggleLabel,
  mobileToggleIcon,
  sidebarWidthClassName = "md:w-64",
  isSticky = false,
}: Props) => {
  return (
    <div className={clsx("flex flex-col gap-4 md:flex-row", className)}>
      <SidebarContainer
        className={clsx("md:flex-none", sidebarWidthClassName, {
          "md:sticky md:top-16 md:max-h-[calc(100dvh-9rem)] md:self-start md:overflow-y-auto md:overscroll-contain lg:top-32":
            isSticky,
        })}
        mobileToggleLabel={mobileToggleLabel}
        mobileToggleIcon={mobileToggleIcon}
      >
        {sidebar}
      </SidebarContainer>

      <div className={clsx("md:min-w-0 md:flex-1", childrenContainerClassName)}>
        {children}
      </div>
    </div>
  );
};
