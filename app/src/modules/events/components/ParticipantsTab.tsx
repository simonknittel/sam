import { requireAuthentication } from "@/modules/auth/server";
import { RolesCell } from "@/modules/citizen/components/RolesCell";
import { getCitizenByDiscordId } from "@/modules/citizen/queries";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { CreateOrUpdateSilcTransaction } from "@/modules/silc/components/CreateOrUpdateSilcTransaction";
import type { Entity, Event, EventDiscordParticipant } from "@prisma/client";
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
import { CreateManagers } from "./CreateManagers";
import { DeleteManager } from "./DeleteManager";

const GRID_COLS = "grid-cols-[160px_160px_1fr]";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly discordParticipants: EventDiscordParticipant[];
    readonly managers: Entity[];
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

  const resolvedParticipants = await getParticipants(event);

  const citizenSearchParams = new URLSearchParams(urlSearchParams);
  if (
    !urlSearchParams.has("sort") ||
    urlSearchParams.get("sort") === "citizen-asc"
  ) {
    citizenSearchParams.set("sort", "citizen-desc");
  } else {
    citizenSearchParams.set("sort", "citizen-asc");
  }

  const joinedAtSearchParams = new URLSearchParams(urlSearchParams);
  if (urlSearchParams.get("sort") === "joined-at-asc") {
    joinedAtSearchParams.set("sort", "joined-at-desc");
  } else {
    joinedAtSearchParams.set("sort", "joined-at-asc");
  }

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

  const resolvedCreatorCitizen = await getCitizenByDiscordId(
    event.discordCreatorId,
  );

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <section className="rounded-primary bg-neutral-800/50 p-4">
        <h2 className="font-bold mb-2 text-lg">Organisator</h2>
        {resolvedCreatorCitizen ? (
          <CitizenLink citizen={resolvedCreatorCitizen} />
        ) : (
          "-"
        )}

        <div className="flex items-center gap-2 mt-4 mb-2">
          <h2 className="font-bold text-lg">Manager</h2>
          {isAllowedToManageEvent && <CreateManagers event={event} />}
        </div>
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
                      <Link
                        href={`/app/spynet/citizen/${manager.id}`}
                        className={clsx("hover:underline px-2 py-1", {
                          "text-green-500":
                            manager.id === authentication.session.entity!.id,
                          "text-brand-red-500":
                            manager.id !== authentication.session.entity!.id,
                        })}
                        prefetch={false}
                      >
                        {manager.handle || manager.id}
                      </Link>

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
      </section>

      {showCreateSilcTransactionButton && (
        <section className="rounded-primary bg-neutral-800/50 p-4">
          <h2 className="font-bold text-lg">SILC-Belohnung</h2>
          <CreateOrUpdateSilcTransaction
            initialReceiverIds={resolvedParticipants.map(
              (participant) => participant.citizen.id,
            )}
            initialDescription={`Event: ${event.name}`}
            className="mt-4"
          />
        </section>
      )}

      <section className="rounded-primary bg-neutral-800/50 p-4 overflow-auto">
        <h2 className="font-bold mb-4 flex items-center gap-2 text-lg">
          Teilnehmer ({sortedResolvedParticipants.length})
          <Tooltip triggerChildren={<FaInfoCircle />}>
            Es werden nur Discord-Anmeldungen mit einem Spynet-Eintrag
            angezeigt.
          </Tooltip>
        </h2>

        {sortedResolvedParticipants.length > 0 ? (
          <table className="w-full min-w-[720px]">
            <thead>
              <tr
                className={clsx(
                  "grid items-center gap-4 text-left text-neutral-500 -mx-2",
                  GRID_COLS,
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

                  <Tooltip triggerChildren={<FaInfoCircle />}>
                    Auf etwa 4 Minuten genau
                  </Tooltip>
                </th>

                <th className="truncate" title="Rollen/Zertifikate">
                  Rollen/Zertifikate
                </th>
              </tr>
            </thead>

            <tbody className="flex flex-col gap-4 mt-2">
              {sortedResolvedParticipants.map((resolvedParticipant) => {
                return (
                  <tr
                    key={resolvedParticipant.citizen.id}
                    className={clsx(
                      "grid items-start gap-4 rounded-secondary -mx-2",
                      GRID_COLS,
                    )}
                  >
                    <td>
                      <Link
                        href={`/app/spynet/citizen/${resolvedParticipant.citizen.id}`}
                        className={clsx(
                          "hover:bg-neutral-800 rounded-secondary px-2 h-8 flex items-center",
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>Zu den gemeldeten Teilnehmern gibt es keine Spynet-Einträge.</p>
        )}
      </section>
    </div>
  );
};
