import { FleetTable } from "@/modules/fleet/components/FleetTable";
import type { EventDetails } from "@sam-monorepo/application";
import clsx from "clsx";
import { getEventFleet } from "../utils/getEventFleet";

interface Props {
  readonly className?: string;
  readonly event: Pick<EventDetails, "id">;
}

export const FleetTab = async ({ className, event }: Props) => {
  const eventFleet = await getEventFleet(event);

  return (
    <section
      className={clsx(
        "overflow-auto rounded-primary bg-neutral-800/50 p-4",
        className,
      )}
      style={{
        gridArea: "fleet",
      }}
    >
      <h2 className="sr-only">Flotte</h2>

      {eventFleet.length > 0 ? (
        <FleetTable fleet={eventFleet} />
      ) : (
        <p>Keine Teilnehmer oder Teilnehmer ohne flight ready Schiffe.</p>
      )}
    </section>
  );
};
