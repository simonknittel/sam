import { requireAuthentication } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import type {
  EventCitizenReference,
  EventParticipantRow,
} from "@/modules/events/queries/eventRelationSelects";
import type { VariantTagBadgeItem } from "@/modules/fleet/queries/shipQuery";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { getAssignedRoles } from "@/modules/roles/utils/getRoles";
import { EventSource, type Event } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { getEventFleet } from "../utils/getEventFleet";
import { getParticipants } from "../utils/getParticipants";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { OverviewTile } from "./OverviewTile";
import { PersonalBriefing } from "./PersonalBriefing";
import { RolesTable } from "./RolesTable";
import { VariantTagsTable } from "./VariantTagsTable";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly participants: EventParticipantRow[];
    readonly managers: EventCitizenReference[];
  };
}

export const OverviewTab = async ({ className, event }: Props) => {
  const authentication = await requireAuthentication();
  const showFleetSummary = await authentication.authorize("orgFleet", "read");
  const showCoverUpload =
    event.source === EventSource.APP &&
    isEventUpdatable(event) &&
    (await isAllowedToManageEvent(event));

  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-4 2xl:flex-row 2xl:items-start",
        className,
      )}
    >
      <OverviewTile
        event={event}
        showCoverUpload={showCoverUpload}
        className="w-full max-w-120 flex-none"
      />

      <div className="flex w-full flex-1 flex-col gap-2 3xl:flex-row md:flex-row lg:flex-col xl:flex-row 2xl:flex-col">
        <PersonalBriefing
          event={event}
          className="w-full flex-initial 3xl:w-1/2 md:w-1/2 lg:w-full xl:w-1/2 2xl:w-full"
        />

        {showFleetSummary && (
          <FleetSummary
            event={event}
            className="w-full flex-initial 3xl:w-1/2 md:w-1/2 lg:w-full xl:w-1/2 2xl:w-full"
          />
        )}

        <ParticipantsSummary
          event={event}
          className="w-full flex-initial 3xl:w-1/2 md:w-1/2 lg:w-full xl:w-1/2 2xl:w-full"
        />
      </div>
    </div>
  );
};

type FleetSummaryProps = Readonly<{
  className?: string;
  event: Event & {
    participants: EventParticipantRow[];
  };
}>;

const FleetSummary = async ({ className, event }: FleetSummaryProps) => {
  const eventFleet = await getEventFleet(event);

  const countedTags = new Map<
    string,
    { tag: VariantTagBadgeItem; count: number }
  >();

  for (const fleetVariant of eventFleet) {
    for (const tag of fleetVariant.variant.tags) {
      if (countedTags.has(tag.id)) {
        countedTags.set(tag.id, {
          tag,
          count: countedTags.get(tag.id)!.count + 1,
        });
      } else {
        countedTags.set(tag.id, {
          tag,
          count: 1,
        });
      }
    }
  }

  return (
    <Tile
      heading="Flotte der Teilnehmer"
      subheading="Summe aller Tags. Nur flight ready."
      className={clsx(className)}
    >
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        <VariantTagsTable rows={Array.from(countedTags.values())} />
      </div>
    </Tile>
  );
};

type ParticipantsSummaryProps = Readonly<{
  className?: string;
  event: Event & {
    participants: EventParticipantRow[];
  };
}>;

const ParticipantsSummary = async ({
  className,
  event,
}: ParticipantsSummaryProps) => {
  const resolvedParticipants = await getParticipants(event);

  const countedRoles = new Map<
    string,
    {
      role: BadgeRole;
      count: number;
    }
  >();

  for (const resolvedParticipant of resolvedParticipants) {
    const roles = await getAssignedRoles(resolvedParticipant.citizen);

    for (const role of roles) {
      if (countedRoles.has(role.id)) {
        countedRoles.set(role.id, {
          role,
          count: countedRoles.get(role.id)!.count + 1,
        });
      } else {
        countedRoles.set(role.id, {
          role,
          count: 1,
        });
      }
    }
  }

  return (
    <Tile
      heading="Rollen/Zertifikate der Teilnehmer"
      subheading="Summe aller Rollen/Zertifikate"
      className={clsx(className)}
    >
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        <RolesTable rows={Array.from(countedRoles.values())} />
      </div>
    </Tile>
  );
};
