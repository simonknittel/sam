"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import Note from "@/modules/common/components/Note";
import type { EventCitizenWithShips } from "@/modules/events/queries/eventRelationSelects";
import type { VariantCatalogManufacturer } from "@/modules/fleet/queries/getVariantCatalog";
import {
  EventSource,
  type Event,
  type Ship,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { toEventContainer } from "../utils/eventContainer";
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
  readonly event: Event;
  readonly positions: PositionType[];
  readonly canManagePositions?: boolean;
  readonly variants: readonly VariantCatalogManufacturer[];
  readonly myShips: readonly Pick<Ship, "variantId">[];
  readonly allEventCitizens: EventCitizenWithShips[];
  readonly showActions?: boolean;
}

export const LineupTab = ({
  className,
  event,
  positions,
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
              container={toEventContainer(event.id)}
              variants={variants}
            />

            <CopyLineupFromEventButton targetEvent={event} />
          </div>
        )}
      </div>

      <Unassigned positions={positions} allEventCitizens={allEventCitizens} />

      {!isCurrentUserEventCitizen &&
        (event.source === EventSource.DISCORD ? (
          <DiscordWarning />
        ) : (
          <Note
            type="warning"
            message={
              <p>
                Du musst dich erst auf der Übersichtsseite bei diesem Event
                anmelden, bevor du dich hier in der Aufstellung anmelden kannst.
              </p>
            }
            className="max-w-none!"
          />
        ))}

      {positions.length > 0 ? (
        <Positions
          container={toEventContainer(event.id)}
          positions={positions}
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
