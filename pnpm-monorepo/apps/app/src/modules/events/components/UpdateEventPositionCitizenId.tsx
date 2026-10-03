"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { EventCitizenWithShips } from "@/modules/events/queries/eventRelationSelects";
import type {
  Citizen,
  EventPosition,
  EventPositionApplication,
} from "@sam-monorepo/database/browser";
import { getCitizenDisplayName } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useTransition, type ChangeEventHandler } from "react";
import { resetEventPositionCitizenId } from "../actions/resetEventPositionCitizenId";
import { updateEventPositionCitizenId } from "../actions/updateEventPositionCitizenId";

interface Props {
  readonly className?: string;
  readonly position: EventPosition & {
    readonly citizen?: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
  };
  readonly citizensSatisfyingRequirements: EventCitizenWithShips[];
  readonly citizensNotSatisfyingRequirements: EventCitizenWithShips[];
  readonly applicationsSatisfyingRequirements: (EventPositionApplication & {
    citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
  })[];
  readonly applicationsNotSatisfyingRequirements: (EventPositionApplication & {
    citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
  })[];
}

export const UpdateEventPositionCitizenId = ({
  className,
  position,
  citizensSatisfyingRequirements,
  citizensNotSatisfyingRequirements,
  applicationsSatisfyingRequirements,
  applicationsNotSatisfyingRequirements,
}: Props) => {
  const [isPending, startTransition] = useTransition();

  /**
   * The choices are the participants that are not deleted. The position can
   * still have a citizen outside of them, for example a deleted citizen.
   * The select shows this citizen, but the manager cannot choose it again.
   */
  const choosableCitizenIds = new Set(
    [
      ...citizensSatisfyingRequirements,
      ...citizensNotSatisfyingRequirements,
    ].map((eventCitizen) => eventCitizen.citizen.id),
  );
  const assignedCitizenOutsideChoices =
    position.citizen && !choosableCitizenIds.has(position.citizen.id)
      ? position.citizen
      : null;

  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const formData = new FormData();
    formData.set("positionId", position.id);
    formData.set("citizenId", event.target.value);

    startTransition(async () => {
      await runAction(
        event.target.value === "-"
          ? resetEventPositionCitizenId
          : updateEventPositionCitizenId,
        formData,
      );
    });
  };

  return (
    <div className={clsx(className)}>
      <input type="hidden" name="positionId" value={position.id} />
      <select
        name="citizenId"
        /** A lineup holds one of these per position, so it names its own */
        aria-label={`Citizen für ${position.name}`}
        className="block w-full cursor-pointer rounded-secondary bg-white/10 p-2 text-neutral-100"
        onChange={handleChange}
        disabled={isPending}
        defaultValue={position.citizenId || "-"}
      >
        <option value="-">-</option>

        {assignedCitizenOutsideChoices && (
          <option value={assignedCitizenOutsideChoices.id} disabled>
            {getCitizenDisplayName(assignedCitizenOutsideChoices)}
          </option>
        )}

        <optgroup label="Interessenten - Voraussetzungen erfüllt">
          {applicationsSatisfyingRequirements
            .sort((a, b) =>
              getCitizenDisplayName(a.citizen).localeCompare(
                getCitizenDisplayName(b.citizen),
              ),
            )
            .map((application) => (
              <option key={application.citizenId} value={application.citizenId}>
                {getCitizenDisplayName(application.citizen)}
              </option>
            ))}
        </optgroup>

        <optgroup label="Interessenten - Voraussetzungen nicht erfüllt">
          {applicationsNotSatisfyingRequirements
            .sort((a, b) =>
              getCitizenDisplayName(a.citizen).localeCompare(
                getCitizenDisplayName(b.citizen),
              ),
            )
            .map((application) => (
              <option key={application.citizenId} value={application.citizenId}>
                {getCitizenDisplayName(application.citizen)}
              </option>
            ))}
        </optgroup>

        <optgroup label="Alle Teilnehmer - Voraussetzungen erfüllt">
          {citizensSatisfyingRequirements
            .sort((a, b) =>
              getCitizenDisplayName(a.citizen).localeCompare(
                getCitizenDisplayName(b.citizen),
              ),
            )
            .map((citizen) => (
              <option key={citizen.citizen.id} value={citizen.citizen.id}>
                {getCitizenDisplayName(citizen.citizen)}
              </option>
            ))}
        </optgroup>

        <optgroup label="Alle Teilnehmer - Voraussetzungen nicht erfüllt">
          {citizensNotSatisfyingRequirements
            .sort((a, b) =>
              getCitizenDisplayName(a.citizen).localeCompare(
                getCitizenDisplayName(b.citizen),
              ),
            )
            .map((citizen) => (
              <option key={citizen.citizen.id} value={citizen.citizen.id}>
                {getCitizenDisplayName(citizen.citizen)}
              </option>
            ))}
        </optgroup>
      </select>
    </div>
  );
};
