import type { Event, EventDiscordParticipant } from "@/generated/prisma/client";
import { FleetTable } from "@/modules/fleet/components/FleetTable";
import clsx from "clsx";
import { getEventFleet } from "../utils/getEventFleet";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    discordParticipants: EventDiscordParticipant[];
  };
}

export const FleetTab = async ({ className, event }: Props) => {
  const eventFleet = await getEventFleet(event);

  return (
    <section
      className={clsx(
        "rounded-primary bg-neutral-800/50 p-4 overflow-auto",
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
