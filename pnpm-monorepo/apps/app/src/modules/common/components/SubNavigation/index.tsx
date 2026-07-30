import clsx from "clsx";
import type { ReactNode } from "react";
import { Item } from "./Item";

interface Props {
  readonly className?: string;
  readonly pages: {
    path: string;
    name: string;
    icon?: ReactNode;
  }[];
}

export const SubNavigation = ({ className, pages }: Props) => {
  return (
    <nav className={clsx("flex flex-wrap", className)}>
      {pages.map((page) => (
        <Item key={page.path} page={page} />
      ))}
    </nav>
  );
};
