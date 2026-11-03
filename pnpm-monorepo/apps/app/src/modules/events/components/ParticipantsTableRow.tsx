import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { RolesCell } from "@/modules/citizen/components/RolesCell";
import { Link } from "@/modules/common/components/Link";
import { TableRowAlignment, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { ResolvedEventParticipant } from "@sam-monorepo/application";
import type { Citizen, Event } from "@sam-monorepo/database/client";
import { DELETED_CITIZEN_LABEL } from "@sam-monorepo/domain";
import clsx from "clsx";
import { Suspense } from "react";
import { RemoveEventParticipant } from "./RemoveEventParticipant";

interface Props {
  readonly eventId: Event["id"];
  readonly resolvedParticipant: ResolvedEventParticipant;
  readonly currentCitizenId: Citizen["id"];
  readonly showCommentColumn: boolean;
  readonly showRemoveButton: boolean;
}

/** The roles wrap, thus a row grows until it shows all roles */
export const ParticipantsTableRow = ({
  eventId,
  resolvedParticipant,
  currentCitizenId,
  showCommentColumn,
  showRemoveButton,
}: Props) => {
  const { citizen, participant } = resolvedParticipant;

  return (
    <TRow alignment={TableRowAlignment.Top}>
      <td className="overflow-hidden">
        {citizen.deletedAt ? (
          <span className="flex h-8 items-center px-2 text-neutral-500">
            {DELETED_CITIZEN_LABEL}
          </span>
        ) : (
          <CitizenPopover citizenId={citizen.id}>
            <Link
              href={`/app/spynet/citizen/${citizen.id}`}
              className={clsx(
                "flex h-8 items-center rounded-secondary px-2 hover:bg-white/10 focus-visible:bg-white/10 active:bg-white/15",
                {
                  "text-green-500": citizen.id === currentCitizenId,
                  "text-brand-red-500": citizen.id !== currentCitizenId,
                },
              )}
              prefetch={false}
            >
              {citizen.handle ? (
                <span className="truncate" title={citizen.handle}>
                  {citizen.handle}
                </span>
              ) : (
                <span className="text-neutral-500 italic">-</span>
              )}
            </Link>
          </CitizenPopover>
        )}
      </td>

      <td className="flex h-8 items-center">
        {participant?.createdAt ? (
          <time dateTime={participant.createdAt.toISOString()}>
            {formatDate(participant.createdAt)}
          </time>
        ) : (
          <span className="text-neutral-500 italic">-</span>
        )}
      </td>

      {showCommentColumn && (
        <td className="flex min-h-8 items-center">
          {participant?.comment ? (
            <span className="line-clamp-2" title={participant.comment}>
              {participant.comment}
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
            entity={citizen}
            assignableRoles={[]}
            className="flex-wrap"
          />
        </Suspense>
      </td>

      {showRemoveButton && (
        <td className="flex min-h-8 items-center">
          <RemoveEventParticipant
            eventId={eventId}
            /**
             * The client component gets only these fields: the citizen also
             * has the Discord ID
             */
            citizen={{
              id: citizen.id,
              handle: citizen.handle,
              deletedAt: citizen.deletedAt,
            }}
          />
        </td>
      )}
    </TRow>
  );
};
