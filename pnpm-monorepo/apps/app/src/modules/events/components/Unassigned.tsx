import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import Note from "@/modules/common/components/Note";
import type { EventCitizenWithShips } from "@/modules/events/types/eventShapes";
import type { Entity, EventPosition } from "@sam-monorepo/database/client";
import clsx from "clsx";

type Position = EventPosition & {
  citizen?: Pick<Entity, "id" | "handle"> | null;
  childPositions?: Position[];
};

interface Props {
  readonly className?: string;
  readonly positions: Position[];
  readonly allEventCitizens: EventCitizenWithShips[];
}

export const Unassigned = ({
  className,
  positions,
  allEventCitizens,
}: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const allPositions: Position[] = [];
  const loop = (positions: Position[]) => {
    for (const position of positions) {
      allPositions.push(position);

      if (position.childPositions) {
        loop(position.childPositions);
      }
    }
  };
  loop(positions);

  const unassignedCitizen = allEventCitizens
    .filter((citizen) => {
      return !allPositions.some(
        (position) => position.citizen?.id === citizen.citizen.id,
      );
    })
    .toSorted((a, b) =>
      (a.citizen.handle || a.citizen.id).localeCompare(
        b.citizen.handle || b.citizen.id,
      ),
    );

  if (unassignedCitizen.length <= 0) return null;

  return (
    <Note
      type="info"
      message={
        <div className="flex flex-col">
          <p className="font-bold font-mono uppercase">
            Keinem Posten zugeordnet
          </p>

          <ul className="mt-1 flex gap-x-3 gap-y-1 flex-wrap">
            {unassignedCitizen.map((citizen) => (
              <li key={citizen.citizen.id}>
                <CitizenLink citizen={citizen.citizen} />
              </li>
            ))}
          </ul>
        </div>
      }
      className={clsx("max-w-none!", className)}
    />
  );
};
