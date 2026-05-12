import type { Entity, Ship } from "@/generated/prisma/client";
import type { PositionType } from "../components/Position";

export const checkRequirements = (
  position: PositionType,
  myShips: Ship[],
  allEventCitizens: { citizen: Entity; ships: Ship[] }[],
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

  const applicationsSatisfyingRequirements = position.applications.filter(
    (application) =>
      citizensSatisfyingRequirements.some(
        (citizen) => citizen.citizen.id === application.citizen.id,
      ),
  );
  const applicationsNotSatisfyingRequirements = position.applications.filter(
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
