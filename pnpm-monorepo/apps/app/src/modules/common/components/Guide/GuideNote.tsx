import clsx from "clsx";
import type { ReactNode } from "react";

export enum GuideNoteVariant {
  Info = "info",
  /** Something that the user cannot undo, or that costs them something */
  Warning = "warning",
}

interface Props {
  readonly variant?: GuideNoteVariant;
  readonly children: ReactNode;
}

/** One note of `GuideNoteList`, in the colors of the `Note` component */
export const GuideNote = ({
  variant = GuideNoteVariant.Info,
  children,
}: Props) => {
  return (
    <li
      className={clsx("rounded-secondary border-t-2 p-4", {
        "border-blue-500 bg-blue-500/10": variant === GuideNoteVariant.Info,
        "border-yellow-500 bg-yellow-500/10":
          variant === GuideNoteVariant.Warning,
      })}
    >
      {children}
    </li>
  );
};
