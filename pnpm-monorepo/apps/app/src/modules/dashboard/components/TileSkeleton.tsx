import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const TileSkeleton = ({ className }: Props) => {
  return (
    <section className={clsx(className, "flex flex-col gap-4 items-center")}>
      <h2 className="font-thin text-2xl self-start font-mono uppercase">
        Events
      </h2>

      <div className="rounded-primary bg-neutral-800/50 h-[160px] animate-pulse w-full" />
    </section>
  );
};
