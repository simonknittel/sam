import { Link } from "@/modules/common/components/Link";
import { getEvents } from "@/modules/events/queries";
import clsx from "clsx";
import { Event } from "./Event";

interface Props {
  readonly className?: string;
}

export const CalendarTile = async ({ className }: Props) => {
  const events = await getEvents("open");

  return (
    <section
      className={clsx(
        "flex flex-col gap-[2px] items-center @4xl/events:overflow-hidden",
        className,
      )}
    >
      <h2 className="font-thin text-2xl mb-2 w-full font-mono uppercase">
        Events
      </h2>

      {events.length > 0 ? (
        events.map((event, index) => (
          <Event key={event.id} event={event} index={index} />
        ))
      ) : (
        <div className="background-secondary rounded-primary p-4 w-full">
          <p>Aktuell sind keine Events geplant.</p>
        </div>
      )}

      <Link
        href="/app/events"
        className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-sm mt-2"
      >
        Alle Events
      </Link>
    </section>
  );
};
