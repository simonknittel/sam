"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { EventCitizenWithShips } from "@/modules/events/queries/eventRelationSelects";
import type {
  Entity,
  EventPosition,
  EventPositionApplication,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useTransition, type ChangeEventHandler } from "react";
import { resetEventPositionCitizenId } from "../actions/resetEventPositionCitizenId";
import { updateEventPositionCitizenId } from "../actions/updateEventPositionCitizenId";
import styles from "./UpdateEventPositionCitizenId.module.css";

interface Props {
  readonly className?: string;
  readonly position: EventPosition;
  readonly citizensSatisfyingRequirements: EventCitizenWithShips[];
  readonly citizensNotSatisfyingRequirements: EventCitizenWithShips[];
  readonly applicationsSatisfyingRequirements: (EventPositionApplication & {
    citizen: Pick<Entity, "id" | "handle">;
  })[];
  readonly applicationsNotSatisfyingRequirements: (EventPositionApplication & {
    citizen: Pick<Entity, "id" | "handle">;
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
        className={clsx(
          "block w-full p-2 bg-white/10 text-neutral-100 rounded-secondary cursor-pointer",
          styles.select,
        )}
        onChange={handleChange}
        disabled={isPending}
        defaultValue={position.citizenId || "-"}
      >
        <option value="-">-</option>

        <optgroup label="Interessenten - Voraussetzungen erfüllt">
          {applicationsSatisfyingRequirements
            .sort((a, b) =>
              (a.citizen.handle || a.citizen.id).localeCompare(
                b.citizen.handle || b.citizen.id,
              ),
            )
            .map((application) => (
              <option key={application.citizenId} value={application.citizenId}>
                {application.citizen.handle}
              </option>
            ))}
        </optgroup>

        <optgroup label="Interessenten - Voraussetzungen nicht erfüllt">
          {applicationsNotSatisfyingRequirements
            .sort((a, b) =>
              (a.citizen.handle || a.citizen.id).localeCompare(
                b.citizen.handle || b.citizen.id,
              ),
            )
            .map((application) => (
              <option key={application.citizenId} value={application.citizenId}>
                {application.citizen.handle}
              </option>
            ))}
        </optgroup>

        <optgroup label="Alle Teilnehmer - Voraussetzungen erfüllt">
          {citizensSatisfyingRequirements
            .sort((a, b) =>
              (a.citizen.handle || a.citizen.id).localeCompare(
                b.citizen.handle || b.citizen.id,
              ),
            )
            .map((citizen) => (
              <option key={citizen.citizen.id} value={citizen.citizen.id}>
                {citizen.citizen.handle}
              </option>
            ))}
        </optgroup>

        <optgroup label="Alle Teilnehmer - Voraussetzungen nicht erfüllt">
          {citizensNotSatisfyingRequirements
            .sort((a, b) =>
              (a.citizen.handle || a.citizen.id).localeCompare(
                b.citizen.handle || b.citizen.id,
              ),
            )
            .map((citizen) => (
              <option key={citizen.citizen.id} value={citizen.citizen.id}>
                {citizen.citizen.handle}
              </option>
            ))}
        </optgroup>
      </select>
    </div>
  );
};
