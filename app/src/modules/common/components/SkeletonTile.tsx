import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const SkeletonTile = ({ className }: Props) => {
  return (
    <div
      className={clsx(
        "bg-neutral-800/50 rounded-primary animate-pulse min-h-90",
        className,
      )}
    />
  );
};
