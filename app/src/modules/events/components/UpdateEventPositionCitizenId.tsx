"use client";

import type {
  Entity,
  EventPosition,
  EventPositionApplication,
  Ship,
} from "@prisma/client";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useTransition, type ChangeEventHandler } from "react";
import toast from "react-hot-toast";
import { resetEventPositionCitizenId } from "../actions/resetEventPositionCitizenId";
import { updateEventPositionCitizenId } from "../actions/updateEventPositionCitizenId";

interface Props {
  readonly className?: string;
  readonly position: EventPosition;
  readonly citizensSatisfyingRequirements: { citizen: Entity; ships: Ship[] }[];
  readonly citizensNotSatisfyingRequirements: {
    citizen: Entity;
    ships: Ship[];
  }[];
  readonly applicationsSatisfyingRequirements: (EventPositionApplication & {
    citizen: Entity;
  })[];
  readonly applicationsNotSatisfyingRequirements: (EventPositionApplication & {
    citizen: Entity;
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
      try {
        const response =
          event.target.value === "-"
            ? await resetEventPositionCitizenId(formData)
            : await updateEventPositionCitizenId(formData);

        if ("error" in response) {
          toast.error(response.error);
          console.error(response);
          return;
        }

        toast.success(response.success);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  return (
    <div className={clsx(className)}>
      <input type="hidden" name="positionId" value={position.id} />
      <select
        name="citizenId"
        className="block w-full p-2 bg-white/10 text-neutral-100 rounded-secondary cursor-pointer"
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
