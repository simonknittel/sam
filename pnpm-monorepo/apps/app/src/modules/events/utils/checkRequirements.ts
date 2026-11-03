import type { EventLineupCitizen } from "@sam-monorepo/application";
import type { Ship } from "@sam-monorepo/database/client";
import { hasRequiredRolesOfPosition } from "@sam-monorepo/domain";
import type { PositionType } from "../components/Position";

const hasRequiredVariant = (
  position: PositionType,
  ships: readonly Pick<Ship, "variantId">[],
) =>
  position.requiredVariants.length <= 0 ||
  position.requiredVariants.some((requiredVariant) =>
    ships.some((ship) => ship.variantId === requiredVariant.variantId),
  );

/**
 * A citizen meets the requirements of a position with one of the required
 * ships and with the required roles
 */
const meetsRequirements = (
  position: PositionType,
  ships: readonly Pick<Ship, "variantId">[],
  roleIds: readonly string[],
) =>
  hasRequiredVariant(position, ships) &&
  hasRequiredRolesOfPosition(position, new Set(roleIds));

export const checkRequirements = (
  position: PositionType,
  myShips: readonly Pick<Ship, "variantId">[],
  myRoleIds: readonly string[],
  allEventCitizens: EventLineupCitizen[],
) => {
  const doesCurrentUserSatisfyRequirements = meetsRequirements(
    position,
    myShips,
    myRoleIds,
  );

  const citizensSatisfyingRequirements = allEventCitizens.filter((citizen) =>
    meetsRequirements(position, citizen.ships, citizen.roleIds),
  );
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
