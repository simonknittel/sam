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
  readonly filters: {
    readonly types: readonly string[];
    /** The raw values of the URL, see `getConfirmationFilterWhere()` */
    readonly confirmationValues: readonly string[];
  };
}

export interface IdentityLogTableFilterOptions {
  readonly types: GenericCitizenLogType[];
  readonly confirmationStates: (ConfirmationStatus | null)[];
}

const requireIdentityLogTablePermissions = (actor: Actor) => {
  requirePermission(actor, "citizen", "read");
  requirePermission(actor, "spynetOther", "read");
};

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

/** Independent of the selected filters */
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
