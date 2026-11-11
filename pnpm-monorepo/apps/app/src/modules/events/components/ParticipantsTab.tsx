import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { CreateOrUpdateSilcTransaction } from "@/modules/silc/components/CreateOrUpdateSilcTransaction";
import type { EventDetails } from "@sam-monorepo/application";
import { EventSource } from "@sam-monorepo/database/client";
import { DELETED_CITIZEN_LABEL } from "@sam-monorepo/domain";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { getEventInvitations } from "../queries/getEventInvitations";
import { getParticipants } from "../utils/getParticipants";
import { isAllowedToManageEvent as _isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { CreateManagers } from "./CreateManagers";
import { DeleteManager } from "./DeleteManager";
import { EventInvitationsTableTile } from "./EventInvitationsTableTile";
import { ParticipantsTableFilters } from "./ParticipantsTableFilters";
import { ParticipantsTableTile } from "./ParticipantsTableTile";

interface Props {
  readonly className?: string;
  readonly event: EventDetails;
  readonly searchParams: Promise<SearchParams>;
}

export const ParticipantsTab = async ({
  className,
  event,
  searchParams,
}: Props) => {
  const authentication = await requireAuthenticationPage();
  if (!authentication.session.entity) forbidden();
  const isAllowedToManageEvent = await _isAllowedToManageEvent(event);
  const showCreateSilcTransactionButton = await authentication.authorize(
    "silcTransactionOfOtherCitizen",
    "create",
  );

  const isAppEvent = event.source === EventSource.APP;
  /**
   * Participation is managed in Discord for Discord events, and the same
   * time gate as every other manager-driven mutation applies.
   */
  const canManageParticipants =
    isAppEvent && isAllowedToManageEvent && isEventUpdatable(event);

  const [resolvedParticipants, invitations] = await Promise.all([
    getParticipants(event),
    getEventInvitations(event),
  ]);

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Tile heading="Organisator">
        {event.createdBy ? <CitizenLink citizen={event.createdBy} /> : "-"}
      </Tile>

      <Tile
        heading="Manager"
        cta={
          isAllowedToManageEvent ? <CreateManagers eventId={event.id} /> : null
        }
      >
        {event.managers.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {event.managers
              .toSorted((a, b) =>
                (a.handle || a.id).localeCompare(b.handle || b.id),
              )
              .map((manager) => {
                if (isAllowedToManageEvent) {
                  return (
                    <div
                      key={manager.id}
                      className="flex rounded-secondary bg-neutral-700/50"
                    >
                      {manager.deletedAt ? (
                        <span className="px-2 py-1 text-neutral-500">
                          {DELETED_CITIZEN_LABEL}
                        </span>
                      ) : (
                        <CitizenPopover citizenId={manager.id}>
                          <Link
                            href={`/app/spynet/citizen/${manager.id}`}
                            className={clsx(
                              "inline-block px-2 py-1 hover:underline",
                              {
                                "text-green-500":
                                  manager.id ===
                                  authentication.session.entity!.id,
                                "text-brand-red-500":
                                  manager.id !==
                                  authentication.session.entity!.id,
                              },
                            )}
                            prefetch={false}
                          >
                            {manager.handle || manager.id}
                          </Link>
                        </CitizenPopover>
                      )}

                      <DeleteManager
                        eventId={event.id}
                        managerId={manager.id}
                      />
                    </div>
                  );
                }

                return <CitizenLink key={manager.id} citizen={manager} />;
              })}
          </div>
        ) : (
          <span className="text-neutral-500">-</span>
        )}
      </Tile>

      {showCreateSilcTransactionButton && (
        <Tile heading="SILC-Belohnung">
          <CreateOrUpdateSilcTransaction
            initialReceiverIds={resolvedParticipants.map(
              (participant) => participant.citizen.id,
            )}
            initialDescription={`Event: ${event.name}`}
          />
        </Tile>
      )}

      <SidebarLayout sidebar={<ParticipantsTableFilters />}>
        <ParticipantsTableTile
          event={event}
          participants={resolvedParticipants}
          currentCitizenId={authentication.session.entity.id}
          isAppEvent={isAppEvent}
          canManageParticipants={canManageParticipants}
          searchParams={searchParams}
        />
      </SidebarLayout>

      {invitations.length > 0 && (
        <EventInvitationsTableTile
          event={event}
          invitations={invitations}
          canManageParticipants={canManageParticipants}
        />
      )}
    </div>
  );
};
