import { Link } from "@/modules/common/components/Link";
import {
  getEvents,
  getOpenEventCount,
} from "@/modules/events/queries/getEvents";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import clsx from "clsx";
import { Event } from "./Event";

interface Props {
  readonly className?: string;
}

/**
 * Keeps the tile short enough to leave room for the rest of the dashboard.
 * Everything beyond that is one click away on the events page, which keeps
 * the shared query's larger page size.
 */
const MAX_EVENTS = 5;

export const CalendarTile = async ({ className }: Props) => {
  const [{ events: allEvents }, openEventCount] = await Promise.all([
    getEvents("open"),
    getOpenEventCount(),
  ]);
  const events = allEvents.slice(0, MAX_EVENTS);

  return (
    <section
      className={clsx(
        "flex flex-col gap-0.5 items-center @4xl/events:overflow-hidden",
        className,
      )}
      data-onboarding-target={OnboardingTargetId.DashboardCalendar}
    >
      <h2 className="font-thin text-2xl mb-2 w-full font-mono uppercase">
        Events
      </h2>

      {events.length > 0 ? (
        events.map((event, index) => (
          <Event key={event.id} event={event} index={index} />
        ))
      ) : (
        <div className="bg-secondary p-4 w-full corners-secondary">
          <p>Aktuell sind keine Events geplant.</p>
        </div>
      )}

      <Link
        href="/app/events"
        className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-sm mt-2"
      >
        Alle Events ({openEventCount})
      </Link>
    </section>
  );
};
