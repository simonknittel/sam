import clsx from "clsx";
import type { ReactNode } from "react";

export const MAIN_CONTENT_ID = "main-content";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * The page's main landmark and the target of the skip link. Since it carries a
 * fixed id, a page must never render more than one of these.
 *
 * `tabIndex` turns it into a valid focus target so that following the skip link
 * moves focus here instead of only scrolling. The focus outline is suppressed
 * because the element is only ever reached that way, never by tabbing.
 */
export const MainContent = ({ className, children }: Props) => {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={clsx("focus:outline-none", className)}
    >
      {children}
    </main>
  );
};
