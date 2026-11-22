import { RolesCell } from "@/modules/citizen/components/RolesCell";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { TableRowAlignment, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { ResolvedEventParticipant } from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";
import { Suspense } from "react";
import { RemoveEventParticipant } from "./RemoveEventParticipant";

interface Props {
  readonly eventId: Event["id"];
  readonly resolvedParticipant: ResolvedEventParticipant;
  readonly showCommentColumn: boolean;
  readonly showRemoveButton: boolean;
}

/** The roles wrap, thus a row grows until it shows all roles */
export const ParticipantsTableRow = ({
  eventId,
  resolvedParticipant,
  showCommentColumn,
  showRemoveButton,
}: Props) => {
  const { citizen, participant } = resolvedParticipant;

  return (
    <TRow alignment={TableRowAlignment.Top}>
      <td className="overflow-hidden">
        <CitizenCellLink
          /* A client component: the browser gets each field */
          citizen={{
            id: citizen.id,
            handle: citizen.handle,
            deletedAt: citizen.deletedAt,
          }}
          className="h-8"
        />
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
