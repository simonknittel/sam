import type { ReactNode } from "react";

interface Props {
  /** `GuideCard` items, best three, so that they fill the row */
  readonly children: ReactNode;
}

export const GuideCardList = ({ children }: Props) => {
  return <ul className="grid gap-4 md:grid-cols-3">{children}</ul>;
};
