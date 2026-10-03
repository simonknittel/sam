import { Link } from "@/modules/common/components/Link";
import {
  getEvents,
  getOpenEventCount,
} from "@/modules/events/queries/getEvents";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import clsx from "clsx";
import { EventListStatus } from "../utils/EventListStatus";
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
  const [
    { events: allEvents, cancelledParticipationEventIds, newEventIds },
    openEventCount,
  ] = await Promise.all([getEvents(EventListStatus.Open), getOpenEventCount()]);
  const events = allEvents.slice(0, MAX_EVENTS);

  return (
    <section
      className={clsx(
        "flex flex-col items-center gap-0.5 @4xl/events:overflow-hidden",
        className,
      )}
      data-onboarding-target={OnboardingTargetId.DashboardCalendar}
    >
      <h2 className="mb-2 w-full font-mono text-2xl font-thin uppercase">
        Events
      </h2>

      {events.length > 0 ? (
        events.map((event, index) => (
          <Event
            key={event.id}
            event={event}
            index={index}
            hasCancelledParticipation={cancelledParticipationEventIds.includes(
              event.id,
            )}
            isNew={newEventIds.has(event.id)}
          />
        ))
      ) : (
        <div className="w-full corners-secondary bg-secondary p-4">
          <p>Aktuell sind keine Events geplant.</p>
        </div>
      )}

      <Link
        href="/app/events"
        className="mt-2 font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline"
      >
        Alle Events ({openEventCount})
      </Link>
    </section>
  );
};
