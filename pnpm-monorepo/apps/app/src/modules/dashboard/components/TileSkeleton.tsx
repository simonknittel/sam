import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const TileSkeleton = ({ className }: Props) => {
  return (
    <section className={clsx(className, "flex flex-col items-center gap-4")}>
      <h2 className="self-start font-mono text-2xl font-thin uppercase">
        Events
      </h2>

      <div className="h-[160px] w-full animate-pulse rounded-primary bg-neutral-800/50" />
    </section>
  );
};
