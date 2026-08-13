import clsx from "clsx";
import { Suspense, type ReactNode } from "react";
import { SkeletonTile } from "../SkeletonTile";
import { ErrorBoundary } from "./ErrorBoundary";

interface Props {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const SuspenseWithErrorBoundaryTile = ({
  className,
  children,
}: Props) => {
  return (
    <ErrorBoundary className={className}>
      <Suspense
        fallback={<SkeletonTile className={clsx("min-h-90", className)} />}
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};
