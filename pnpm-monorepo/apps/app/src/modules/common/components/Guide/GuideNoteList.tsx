import type { ReactNode } from "react";

interface Props {
  /** `GuideNote` items, best three, so that they fill the row */
  readonly children: ReactNode;
}

export const GuideNoteList = ({ children }: Props) => {
  return (
    <ul className="grid gap-4 text-sm leading-relaxed text-white/70 md:grid-cols-3">
      {children}
    </ul>
  );
};
