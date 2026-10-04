import { requireAuthentication } from "@/modules/auth/server";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { RolesCell } from "@/modules/citizen/components/RolesCell";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import type {
  EventCitizenReference,
  EventParticipantRow,
} from "@/modules/events/queries/eventRelationSelects";
import { CreateOrUpdateSilcTransaction } from "@/modules/silc/components/CreateOrUpdateSilcTransaction";
import { EventSource, type Event } from "@sam-monorepo/database/client";
import { DELETED_CITIZEN_LABEL } from "@sam-monorepo/domain";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import {
  createLoader,
  createSerializer,
  parseAsStringEnum,
  type SearchParams,
} from "nuqs/server";
import { Suspense } from "react";
import {
  FaInfoCircle,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSortNumericDown,
  FaSortNumericUp,
} from "react-icons/fa";
import { getParticipants } from "../utils/getParticipants";
import { isAllowedToManageEvent as _isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { AddEventParticipants } from "./AddEventParticipants";
import { CreateManagers } from "./CreateManagers";
import { DeleteManager } from "./DeleteManager";
import { RemoveEventParticipant } from "./RemoveEventParticipant";

enum ParticipantSort {
  CitizenAscending = "citizen-asc",
  CitizenDescending = "citizen-desc",
  JoinedAtAscending = "joined-at-asc",
  JoinedAtDescending = "joined-at-desc",
}

const searchParamsParsers = {
  sort: parseAsStringEnum(Object.values(ParticipantSort)).withDefault(
    ParticipantSort.CitizenAscending,
  ),
};
const loadSearchParams = createLoader(searchParamsParsers);
const serializeSearchParams = createSerializer(searchParamsParsers);

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly participants: EventParticipantRow[];
    readonly managers: EventCitizenReference[];
    readonly createdBy?: EventCitizenReference | null;
  };
  readonly searchParams: Promise<SearchParams>;
}

export const ParticipantsTab = async ({
  className,
  event,
  searchParams,
}: Props) => {
  const authentication = await requireAuthentication();
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
  const gridCols = clsx({
    "grid-cols-[160px_160px_1fr]": !isAppEvent,
    "grid-cols-[160px_160px_240px_1fr]": isAppEvent && !canManageParticipants,
    "grid-cols-[160px_160px_240px_1fr_32px]":
      isAppEvent && canManageParticipants,
  });

  const resolvedParticipants = await getParticipants(event);

  const { sort } = await loadSearchParams(searchParams);
  const getSortHref = (nextSort: ParticipantSort) =>
    serializeSearchParams(`/app/events/${event.id}/participants`, {
      sort: nextSort,
    });

  const sortedResolvedParticipants = resolvedParticipants.toSorted((a, b) => {
    switch (sort) {
      case ParticipantSort.CitizenAscending:
        return sortAscWithAndNullLast(a.citizen.handle, b.citizen.handle);
      case ParticipantSort.CitizenDescending:
        return sortDescAndNullLast(a.citizen.handle, b.citizen.handle);

      case ParticipantSort.JoinedAtAscending:
        return sortAscWithAndNullLast(
          a.participant?.createdAt?.getTime(),
          b.participant?.createdAt?.getTime(),
        );
      case ParticipantSort.JoinedAtDescending:
        return sortDescAndNullLast(
          a.participant?.createdAt?.getTime(),
          b.participant?.createdAt?.getTime(),
        );

      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Tile heading="Organisator">
        {event.createdBy ? <CitizenLink citizen={event.createdBy} /> : "-"}
      </Tile>

      <Tile
        heading="Manager"
        cta={isAllowedToManageEvent ? <CreateManagers event={event} /> : null}
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

      <Tile
        heading={
          <span className="flex items-center gap-2">
            Teilnehmer ({sortedResolvedParticipants.length})
            {!isAppEvent && (
              <Tooltip triggerChildren={<FaInfoCircle />}>
                Es werden nur Discord-Anmeldungen mit einem Spynet-Eintrag
                angezeigt.
              </Tooltip>
            )}
          </span>
        }
        cta={
          canManageParticipants ? (
            <AddEventParticipants eventId={event.id} />
          ) : null
        }
        childrenClassName="overflow-auto"
      >
        {sortedResolvedParticipants.length > 0 ? (
          <table className="w-full min-w-180">
            <thead>
              <tr
                className={clsx(
                  "-mx-2 grid items-center gap-4 text-left text-neutral-500",
                  gridCols,
                )}
              >
                <th className="px-2">
                  <Link
                    href={getSortHref(
                      sort === ParticipantSort.CitizenAscending
                        ? ParticipantSort.CitizenDescending
                        : ParticipantSort.CitizenAscending,
                    )}
                    className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300 focus-visible:text-neutral-300 active:text-neutral-200"
                  >
                    Citizen
                    {sort === ParticipantSort.CitizenAscending && (
                      <FaSortAlphaDown />
                    )}
                    {sort === ParticipantSort.CitizenDescending && (
                      <FaSortAlphaUp />
                    )}
                  </Link>
                </th>

                <th className="flex items-center gap-2">
                  <Link
                    href={getSortHref(
                      sort === ParticipantSort.JoinedAtAscending
                        ? ParticipantSort.JoinedAtDescending
                        : ParticipantSort.JoinedAtAscending,
                    )}
                    className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300 focus-visible:text-neutral-300 active:text-neutral-200"
                  >
                    Zugesagt am
                    {sort === ParticipantSort.JoinedAtAscending && (
                      <FaSortNumericDown />
                    )}
                    {sort === ParticipantSort.JoinedAtDescending && (
                      <FaSortNumericUp />
                    )}
                  </Link>

                  {!isAppEvent && (
                    <Tooltip triggerChildren={<FaInfoCircle />}>
                      Auf etwa 4 Minuten genau
                    </Tooltip>
                  )}
                </th>

                {isAppEvent && (
                  <th className="truncate" title="Kommentar">
                    Kommentar
                  </th>
                )}

                <th className="truncate" title="Rollen/Zertifikate">
                  Rollen/Zertifikate
                </th>

                {canManageParticipants && (
                  <th>
                    <span className="sr-only">Aktionen</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="mt-2 flex flex-col gap-4">
              {sortedResolvedParticipants.map((resolvedParticipant) => {
                return (
                  <tr
                    key={resolvedParticipant.citizen.id}
                    className={clsx(
                      "-mx-2 grid items-start gap-4 rounded-secondary",
                      gridCols,
                    )}
                  >
                    <td>
                      {resolvedParticipant.citizen.deletedAt ? (
                        <span className="flex h-8 items-center px-2 text-neutral-500">
                          {DELETED_CITIZEN_LABEL}
                        </span>
                      ) : (
                        <CitizenPopover
                          citizenId={resolvedParticipant.citizen.id}
                        >
                          <Link
                            href={`/app/spynet/citizen/${resolvedParticipant.citizen.id}`}
                            className={clsx(
                              "flex h-8 items-center rounded-secondary px-2 hover:bg-white/10",
                              {
                                "text-green-500":
                                  resolvedParticipant.citizen.id ===
                                  authentication.session.entity!.id,
                                "text-brand-red-500":
                                  resolvedParticipant.citizen.id !==
                                  authentication.session.entity!.id,
                              },
                            )}
                            prefetch={false}
                          >
                            <span className="overflow-hidden text-ellipsis">
                              {resolvedParticipant.citizen.handle ? (
                                <span
                                  title={resolvedParticipant.citizen.handle}
                                >
                                  {resolvedParticipant.citizen.handle}
                                </span>
                              ) : (
                                <span className="text-neutral-500 italic">
                                  -
                                </span>
                              )}
                            </span>
                          </Link>
                        </CitizenPopover>
                      )}
                    </td>

                    <td className="flex h-8 items-center">
                      {resolvedParticipant.participant?.createdAt ? (
                        <time>
                          {formatDate(
                            resolvedParticipant.participant.createdAt,
                          )}
                        </time>
                      ) : (
                        <span className="text-neutral-500 italic">-</span>
                      )}
                    </td>

                    {isAppEvent && (
                      <td className="flex min-h-8 items-center">
                        {resolvedParticipant.participant?.comment ? (
                          <span
                            className="line-clamp-2 overflow-hidden text-ellipsis"
                            title={resolvedParticipant.participant.comment}
                          >
                            {resolvedParticipant.participant.comment}
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">-</span>
                        )}
                      </td>
                    )}

                    <td className="flex min-h-8 items-center">
                      <Suspense
                        fallback={
                          <div className="h-8 w-20 animate-pulse rounded-secondary bg-neutral-800" />
                        }
                      >
                        <RolesCell
                          entity={resolvedParticipant.citizen}
                          assignableRoles={[]}
                          className="flex-wrap"
                        />
                      </Suspense>
                    </td>

                    {canManageParticipants && (
                      <td className="flex min-h-8 items-center">
                        <RemoveEventParticipant
                          eventId={event.id}
                          citizen={resolvedParticipant.citizen}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>
            {isAppEvent
              ? "Bisher hat sich niemand angemeldet."
              : "Zu den gemeldeten Teilnehmern gibt es keine Spynet-Einträge."}
          </p>
        )}
      </Tile>
    </div>
  );
};
