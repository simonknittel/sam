"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import {
  type Entity,
  type Event,
  type Manufacturer,
  type Series,
  type Ship,
  type Variant,
} from "@prisma/client";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { CopyLineupFromEventButton } from "./CopyLineupFromEventButton";
import { CreateOrUpdateEventPosition } from "./CreateOrUpdateEventPosition";
import { DiscordWarning } from "./DiscordWarning";
import type { PositionType } from "./Position";
import { PositionSkeleton } from "./PositionSkeleton";
import { Unassigned } from "./Unassigned";
import { UpdateEventLineupEnabled } from "./UpdateEventLineupEnabled";

const Positions = dynamic(
  () => import("./Positions").then((mod) => mod.Positions),
  { ssr: false, loading: () => <PositionSkeleton /> },
);

interface Props {
  readonly className?: string;
  readonly event: Event & {
    positions: PositionType[];
  };
  readonly canManagePositions?: boolean;
  readonly variants: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
  readonly myShips: Ship[];
  readonly allEventCitizens: { citizen: Entity; ships: Ship[] }[];
  readonly showActions?: boolean;
}

export const LineupTab = ({
  className,
  event,
  canManagePositions,
  variants,
  myShips,
  allEventCitizens,
  showActions,
}: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const isCurrentUserEventCitizen = allEventCitizens.some(
    (citizen) => citizen.citizen.id === authentication.session.entity?.id,
  );

  return (
    <section className={clsx("flex flex-col gap-2", className)}>
      <div className="flex justify-end">
        <h2 className="sr-only">Aufstellung</h2>

        {canManagePositions && (
          <div className="flex items-center gap-4">
            <UpdateEventLineupEnabled event={event} />

            <CreateOrUpdateEventPosition
              eventId={event.id}
              variants={variants}
            />

            <CopyLineupFromEventButton targetEvent={event} />
          </div>
        )}
      </div>

      <Unassigned
        positions={event.positions}
        allEventCitizens={allEventCitizens}
      />

      {!isCurrentUserEventCitizen && <DiscordWarning />}

      {event.positions.length > 0 ? (
        <Positions
          positions={event.positions}
          canManagePositions={canManagePositions}
          variants={variants}
          myShips={myShips}
          allEventCitizens={allEventCitizens}
          showActions={showActions}
        />
      ) : (
        <p className="rounded-primary bg-neutral-800/50 p-4">
          Keine Posten vorhanden. Diese können vom Organisator des Events
          angelegt und zugeordnet werden.
        </p>
      )}
    </section>
  );
};
