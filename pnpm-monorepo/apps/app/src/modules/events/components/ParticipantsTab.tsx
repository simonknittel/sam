import { requireAuthentication } from "@/modules/auth/server";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { RolesCell } from "@/modules/citizen/components/RolesCell";
import { getCitizenByDiscordId } from "@/modules/citizen/queries/getCitizenByDiscordId";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { toggleSortParam } from "@/modules/common/utils/toggleSortParam";
import type {
  EventCitizenReference,
  EventParticipantRow,
} from "@/modules/events/types/eventShapes";
import { CreateOrUpdateSilcTransaction } from "@/modules/silc/components/CreateOrUpdateSilcTransaction";
import { EventSource, type Event } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { forbidden } from "next/navigation";
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

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly participants: EventParticipantRow[];
    readonly managers: EventCitizenReference[];
    readonly createdBy?: EventCitizenReference | null;
  };
  readonly urlSearchParams: URLSearchParams;
}

export const ParticipantsTab = async ({
  className,
  event,
  urlSearchParams,
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

  const citizenSearchParams = toggleSortParam(urlSearchParams, "citizen", {
    treatMissingAs: "citizen-asc",
  });
  const joinedAtSearchParams = toggleSortParam(urlSearchParams, "joined-at");

  const sortedResolvedParticipants = resolvedParticipants.toSorted((a, b) => {
    switch (urlSearchParams.get("sort")) {
      case "citizen-asc":
        return sortAscWithAndNullLast(a.citizen.handle, b.citizen.handle);
      case "citizen-desc":
        return sortDescAndNullLast(a.citizen.handle, b.citizen.handle);

      case "joined-at-asc":
        return sortAscWithAndNullLast(
          a.participant?.createdAt?.getTime(),
          b.participant?.createdAt?.getTime(),
        );
      case "joined-at-desc":
        return sortDescAndNullLast(
          a.participant?.createdAt?.getTime(),
          b.participant?.createdAt?.getTime(),
        );

      default:
        return sortAscWithAndNullLast(a.citizen.handle, b.citizen.handle);
    }
  });

  const resolvedCreatorCitizen = isAppEvent
    ? (event.createdBy ?? null)
    : event.discordCreatorId
      ? await getCitizenByDiscordId(event.discordCreatorId)
      : null;

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <Tile heading="Organisator">
        {resolvedCreatorCitizen ? (
          <CitizenLink citizen={resolvedCreatorCitizen} />
        ) : (
          "-"
        )}
      </Tile>

      <Tile
        heading="Manager"
        cta={isAllowedToManageEvent ? <CreateManagers event={event} /> : null}
      >
        {event.managers.length > 0 ? (
          <div className="flex gap-x-3 gap-y-1 flex-wrap">
            {event.managers
              .toSorted((a, b) =>
                (a.handle || a.id).localeCompare(b.handle || b.id),
              )
              .map((manager) => {
                if (isAllowedToManageEvent) {
                  return (
                    <div
                      key={manager.id}
                      className="rounded-secondary bg-neutral-700/50 flex"
                    >
                      <CitizenPopover citizenId={manager.id}>
                        <Link
                          href={`/app/spynet/citizen/${manager.id}`}
                          className={clsx(
                            "hover:underline px-2 py-1 inline-block",
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
                  "grid items-center gap-4 text-left text-neutral-500 -mx-2",
                  gridCols,
                )}
              >
                <th className="px-2">
                  <Link
                    href={`?${citizenSearchParams.toString()}`}
                    className="flex items-center gap-2 cursor-pointer select-none hover:text-neutral-300 whitespace-nowrap"
                  >
                    Citizen
                    {(!urlSearchParams.has("sort") ||
                      urlSearchParams.get("sort") === "citizen-asc") && (
                      <FaSortAlphaDown />
                    )}
                    {urlSearchParams.get("sort") === "citizen-desc" && (
                      <FaSortAlphaUp />
                    )}
                  </Link>
                </th>

                <th className="flex items-center gap-2">
                  <Link
                    href={`?${joinedAtSearchParams.toString()}`}
                    className="flex items-center gap-2 cursor-pointer select-none hover:text-neutral-300 whitespace-nowrap"
                  >
                    Zugesagt am
                    {urlSearchParams.get("sort") === "joined-at-asc" && (
                      <FaSortNumericDown />
                    )}
                    {urlSearchParams.get("sort") === "joined-at-desc" && (
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

            <tbody className="flex flex-col gap-4 mt-2">
              {sortedResolvedParticipants.map((resolvedParticipant) => {
                return (
                  <tr
                    key={resolvedParticipant.citizen.id}
                    className={clsx(
                      "grid items-start gap-4 rounded-secondary -mx-2",
                      gridCols,
                    )}
                  >
                    <td>
                      <CitizenPopover
                        citizenId={resolvedParticipant.citizen.id}
                      >
                        <Link
                          href={`/app/spynet/citizen/${resolvedParticipant.citizen.id}`}
                          className={clsx(
                            "hover:bg-white/10 rounded-secondary px-2 h-8 flex items-center",
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
                              <span title={resolvedParticipant.citizen.handle}>
                                {resolvedParticipant.citizen.handle}
                              </span>
                            ) : (
                              <span className="text-neutral-500 italic">-</span>
                            )}
                          </span>
                        </Link>
                      </CitizenPopover>
                    </td>

                    <td className="h-8 flex items-center">
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
                      <td className="min-h-8 flex items-center">
                        {resolvedParticipant.participant?.comment ? (
                          <span
                            className="overflow-hidden text-ellipsis line-clamp-2"
                            title={resolvedParticipant.participant.comment}
                          >
                            {resolvedParticipant.participant.comment}
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">-</span>
                        )}
                      </td>
                    )}

                    <td className="min-h-8 flex items-center">
                      <Suspense
                        fallback={
                          <div className="bg-neutral-800 animate-pulse rounded-secondary h-8 w-20" />
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
                      <td className="min-h-8 flex items-center">
                        <RemoveEventParticipant
                          eventId={event.id}
                          citizenId={resolvedParticipant.citizen.id}
                          citizenHandle={resolvedParticipant.citizen.handle}
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
