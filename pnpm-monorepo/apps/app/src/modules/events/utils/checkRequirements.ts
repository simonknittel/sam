import type { EventLineupCitizen } from "@sam-monorepo/application";
import type { Ship } from "@sam-monorepo/database/client";
import { getMissingRequiredRoleIds } from "@sam-monorepo/domain";
import type { PositionType } from "../components/Position";

/** The requirements of a position that a citizen does not meet */
export interface UnmetRequirements {
  /** The citizen has none of the required ships */
  readonly isShipMissing: boolean;
  /** See `getMissingRequiredRoleIds()` */
  readonly missingRoleIds: readonly string[];
}

export type CheckedEventLineupCitizen = EventLineupCitizen & {
  readonly unmetRequirements: UnmetRequirements;
};

export type CheckedApplication = NonNullable<
  PositionType["applications"]
>[number] & {
  readonly unmetRequirements: UnmetRequirements;
};

const hasRequiredVariant = (
  position: PositionType,
  ships: readonly Pick<Ship, "variantId">[],
) =>
  position.requiredVariants.length <= 0 ||
  position.requiredVariants.some((requiredVariant) =>
    ships.some((ship) => ship.variantId === requiredVariant.variantId),
  );

const getUnmetRequirements = (
  position: PositionType,
  ships: readonly Pick<Ship, "variantId">[],
  roleIds: readonly string[],
): UnmetRequirements => ({
  isShipMissing: !hasRequiredVariant(position, ships),
  missingRoleIds: getMissingRequiredRoleIds(position, new Set(roleIds)),
});

export const meetsRequirements = (unmetRequirements: UnmetRequirements) =>
  !unmetRequirements.isShipMissing &&
  unmetRequirements.missingRoleIds.length <= 0;

export const checkRequirements = (
  position: PositionType,
  myShips: readonly Pick<Ship, "variantId">[],
  myRoleIds: readonly string[],
  allEventCitizens: EventLineupCitizen[],
) => {
  const doesCurrentUserSatisfyRequirements = meetsRequirements(
    getUnmetRequirements(position, myShips, myRoleIds),
  );

  const checkedCitizens: CheckedEventLineupCitizen[] = allEventCitizens.map(
    (eventCitizen) => ({
      ...eventCitizen,
      unmetRequirements: getUnmetRequirements(
        position,
        eventCitizen.ships,
        eventCitizen.roleIds,
      ),
    }),
  );
  const unmetRequirementsByCitizenId = new Map(
    checkedCitizens.map((eventCitizen) => [
      eventCitizen.citizen.id,
      eventCitizen.unmetRequirements,
    ]),
  );

  /** The applications of citizens who do not participate anymore drop out */
  const checkedApplications: CheckedApplication[] = (
    position.applications ?? []
  ).flatMap((application) => {
    const unmetRequirements = unmetRequirementsByCitizenId.get(
      application.citizen.id,
    );

    return unmetRequirements ? [{ ...application, unmetRequirements }] : [];
  });

  return {
    doesCurrentUserSatisfyRequirements,
    citizensSatisfyingRequirements: checkedCitizens.filter((eventCitizen) =>
      meetsRequirements(eventCitizen.unmetRequirements),
    ),
    citizensNotSatisfyingRequirements: checkedCitizens.filter(
      (eventCitizen) => !meetsRequirements(eventCitizen.unmetRequirements),
    ),
    applicationsSatisfyingRequirements: checkedApplications.filter(
      (application) => meetsRequirements(application.unmetRequirements),
    ),
    applicationsNotSatisfyingRequirements: checkedApplications.filter(
      (application) => !meetsRequirements(application.unmetRequirements),
    ),
  };
};
