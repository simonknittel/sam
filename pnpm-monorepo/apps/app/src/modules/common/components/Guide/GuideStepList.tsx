import clsx from "clsx";
import { Children, type ReactNode } from "react";

/** Up to this number of steps, they stand in one row from the `md` breakpoint */
const MAXIMUM_STEPS_IN_ONE_ROW_FROM_MD = 3;

interface Props {
  /** `GuideStep` items */
  readonly children: ReactNode;
}

/**
 * The steps in the order of their numbers. From the `xl` breakpoint all steps
 * stand in one row, below it two per row, so that no step stands alone.
 */
export const GuideStepList = ({ children }: Props) => {
  const isOneRowFromMd =
    Children.count(children) <= MAXIMUM_STEPS_IN_ONE_ROW_FROM_MD;

  return (
    <ol
      className={clsx("grid gap-4", {
        "md:auto-cols-fr md:grid-flow-col": isOneRowFromMd,
        "md:grid-cols-2 xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none":
          !isOneRowFromMd,
      })}
    >
      {children}
    </ol>
  );
};
