import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly value: string;
}

export const SmallBadge = ({ className, value }: Props) => {
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 overflow-hidden rounded-secondary bg-tertiary px-1 py-1 text-xs",
        className,
      )}
      title={value}
    >
      {value}
    </div>
  );
};
