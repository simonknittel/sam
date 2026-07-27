import clsx from "clsx";
import { type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
}

export const RichText = ({ className, children }: Props) => {
  return (
    <div className={clsx(className, "prose prose-invert")}>{children}</div>
  );
};
