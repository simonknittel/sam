import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const SkeletonTile = ({ className }: Props) => {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-primary bg-neutral-800/50",
        className,
      )}
    />
  );
};
