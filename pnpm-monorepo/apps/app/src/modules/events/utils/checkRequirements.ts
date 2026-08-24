import type { EventCitizenWithShips } from "@/modules/events/types/eventShapes";
import type { Ship } from "@sam-monorepo/database/client";
import type { PositionType } from "../components/Position";

export const checkRequirements = (
  position: PositionType,
  myShips: Ship[],
  allEventCitizens: EventCitizenWithShips[],
) => {
  let doesCurrentUserSatisfyRequirements = true;
  if (
    position.requiredVariants.length > 0 &&
    !position.requiredVariants.some((requiredVariant) =>
      myShips.some((ship) => ship.variantId === requiredVariant.variantId),
    )
  )
    doesCurrentUserSatisfyRequirements = false;

  let citizensSatisfyingRequirements = allEventCitizens;
  if (position.requiredVariants.length > 0) {
    citizensSatisfyingRequirements = citizensSatisfyingRequirements.filter(
      (citizen) =>
        citizen.ships.some((ship) =>
          position.requiredVariants.some(
            (requiredVariant) => requiredVariant.variantId === ship.variantId,
          ),
        ),
    );
  }
  const citizensNotSatisfyingRequirements = allEventCitizens.filter(
    (citizen) =>
      !citizensSatisfyingRequirements.some(
        (c) => c.citizen.id === citizen.citizen.id,
      ),
  );

  const applications = position.applications ?? [];
  const applicationsSatisfyingRequirements = applications.filter(
    (application) =>
      citizensSatisfyingRequirements.some(
        (citizen) => citizen.citizen.id === application.citizen.id,
      ),
  );
  const applicationsNotSatisfyingRequirements = applications.filter(
    (application) =>
      citizensNotSatisfyingRequirements.some(
        (citizen) => citizen.citizen.id === application.citizen.id,
      ),
  );

  return {
    doesCurrentUserSatisfyRequirements,
    citizensSatisfyingRequirements,
    citizensNotSatisfyingRequirements,
    applicationsSatisfyingRequirements,
    applicationsNotSatisfyingRequirements,
  };
};
