"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import Note from "@/modules/common/components/Note";
import type { VariantCatalogManufacturer } from "@/modules/fleet/queries/getVariantCatalog";
import type { EventLineupCitizen } from "@sam-monorepo/application";
import { EventSource, type Ship } from "@sam-monorepo/database/browser";
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
  readonly eventId: string;
  readonly eventSource: EventSource;
  readonly lineupEnabled: boolean;
  readonly positions: PositionType[];
  readonly canManagePositions?: boolean;
  readonly variants: readonly VariantCatalogManufacturer[];
  readonly myShips: readonly Pick<Ship, "variantId">[];
  readonly myRoleIds: readonly string[];
  readonly allEventCitizens: EventLineupCitizen[];
  readonly showActions?: boolean;
}

export const LineupTab = ({
  className,
  eventId,
  eventSource,
  lineupEnabled,
  positions,
  canManagePositions,
  variants,
  myShips,
  myRoleIds,
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
            <UpdateEventLineupEnabled
              eventId={eventId}
              lineupEnabled={lineupEnabled}
            />

            <CreateOrUpdateEventPosition
              container={toEventContainer(eventId)}
              variants={variants}
            />

            <CopyLineupFromEventButton targetEventId={eventId} />
          </div>
        )}
      </div>

      <Unassigned positions={positions} allEventCitizens={allEventCitizens} />

      {!isCurrentUserEventCitizen &&
        (eventSource === EventSource.DISCORD ? (
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
          container={toEventContainer(eventId)}
          positions={positions}
          canManagePositions={canManagePositions}
          variants={variants}
          myShips={myShips}
          myRoleIds={myRoleIds}
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
