import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly value: string;
}

export const SmallBadge = ({ className, value }: Props) => {
  return (
    <div
      className={clsx(
        "rounded-secondary bg-tertiary px-1 py-1 inline-flex gap-2 items-center overflow-hidden text-xs",
        className,
      )}
      title={value}
    >
      {value}
    </div>
  );
};
