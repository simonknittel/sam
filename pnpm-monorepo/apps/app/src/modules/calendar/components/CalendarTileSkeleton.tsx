import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/** The placeholder of the dashboard tile while its entries load */
export const CalendarTileSkeleton = ({ className }: Props) => {
  return (
    <section className={clsx(className, "flex flex-col items-center gap-4")}>
      <h2 className="sr-only">Kalender</h2>

      <div className="h-40 w-full rounded-primary bg-neutral-800/50 motion-safe:animate-pulse" />
    </section>
  );
};
