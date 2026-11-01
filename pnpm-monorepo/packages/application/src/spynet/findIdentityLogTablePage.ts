import type { ConfirmationStatus } from "@sam-monorepo/database/client";
import {
  IDENTITY_LOG_TYPES,
  type GenericCitizenLogType,
} from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  getConfirmationFilterWhere,
  loadCitizenLogTablePage,
  type CitizenLogTablePage,
  type CitizenLogTablePageOptions,
  type CitizenLogTablePageRequest,
} from "./citizenLogTablePage.js";
import { getReadableCitizenLogWhere } from "./readableCitizenLogWhere.js";

export interface IdentityLogTablePageInput extends CitizenLogTablePageRequest {
  /** The values of the URL filters. Empty for no filter. */
  readonly filters: {
    readonly types: readonly string[];
    /**
     * The raw values (`ConfirmationValue`): an unknown value adds no
     * condition, thus only unknown values match no log
     */
    readonly confirmationValues: readonly string[];
  };
}

/** The values that at least one visible log has: the filters offer them */
export interface IdentityLogTableFilterOptions {
  readonly types: GenericCitizenLogType[];
  readonly confirmationStates: (ConfirmationStatus | null)[];
}

const requireIdentityLogTablePermissions = (actor: Actor) => {
  requirePermission(actor, "citizen", "read");
  requirePermission(actor, "spynetOther", "read");
};

/**
 * One page of the table of the identity logs (handles, IDs, …) of the
 * Spynet. Requires `citizen;read` and `spynetOther;read`, like the page.
 */
export const findIdentityLogTablePage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { filters, ...pageRequest }: IdentityLogTablePageInput,
  options: CitizenLogTablePageOptions,
): Promise<CitizenLogTablePage> => {
  requireIdentityLogTablePermissions(actor);

  return loadCitizenLogTablePage(
    context,
    {
      AND: [
        await getReadableCitizenLogWhere(context, actor, IDENTITY_LOG_TYPES),
        getConfirmationFilterWhere(filters.confirmationValues),
        filters.types.length > 0 ? { type: { in: [...filters.types] } } : {},
      ],
    },
    pageRequest,
    options,
  );
};

/**
 * The filter values of the identity log table, independent of the selected
 * filters. Requires `citizen;read` and `spynetOther;read`, like the page.
 */
export const findIdentityLogTableFilterOptions = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<IdentityLogTableFilterOptions> => {
  requireIdentityLogTablePermissions(actor);

  const filterOptions = await context.prisma.citizenLog.groupBy({
    by: ["type", "confirmed"],
    where: await getReadableCitizenLogWhere(context, actor, IDENTITY_LOG_TYPES),
  });

  return {
    types: [
      ...new Set(
        filterOptions.flatMap((option) =>
          IDENTITY_LOG_TYPES.filter((type) => type === option.type),
        ),
      ),
    ],
    confirmationStates: [
      ...new Set(filterOptions.map((option) => option.confirmed)),
    ],
  };
};
