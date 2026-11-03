import type { Prisma } from "@sam-monorepo/database/client";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";

/**
 * The variant catalog of one position, down to the manufacturer logo the
 * lineup renders. The logo is a `VariantWithLogo`, which is exactly
 * `Pick<Upload, "id" | "mimeType">`.
 */
const REQUIRED_VARIANTS_INCLUDE = {
  orderBy: {
    order: "asc",
  },
  include: {
    variant: {
      include: {
        series: {
          include: {
            manufacturer: {
              include: {
                image: { select: { id: true, mimeType: true } },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.EventPosition$requiredVariantsArgs;

/**
 * Only the ids: the role badges of the app take the names of the roles that
 * the viewer can see from the roles context
 */
const REQUIRED_ROLES_INCLUDE = {
  select: { roleId: true },
} as const satisfies Prisma.EventPosition$requiredRolesArgs;

/**
 * Everything the lineup renders for one position, without its children.
 * Citizens appear as `CitizenLink`s, so they are joined as {id, handle}
 * rather than as full Citizen rows with their Discord and Teamspeak ids and
 * SILC balances — the whole tree is serialized into client components.
 */
const POSITION_INCLUDE = {
  applications: {
    include: {
      citizen: { select: CITIZEN_REFERENCE_SELECT },
    },
  },
  citizen: { select: CITIZEN_REFERENCE_SELECT },
  requiredVariants: REQUIRED_VARIANTS_INCLUDE,
  requiredRoles: REQUIRED_ROLES_INCLUDE,
} satisfies Prisma.EventPositionInclude;

/**
 * The same shape for a template blueprint, whose positions can never have
 * an assigned citizen or applications — those two joins would always
 * resolve to nothing.
 */
const TEMPLATE_POSITION_INCLUDE = {
  requiredVariants: REQUIRED_VARIANTS_INCLUDE,
  requiredRoles: REQUIRED_ROLES_INCLUDE,
} satisfies Prisma.EventPositionInclude;

const CHILDREN_ORDER = { order: "asc" } as const;

/**
 * The nested lineup as the editor renders it, four levels deep — the depth
 * `LINEUP_MAX_DEPTH` of the domain package. Shared by the event lineup and
 * the lineup of a template blueprint, which store their positions in the same
 * table.
 */
export const POSITION_TREE_INCLUDE = {
  ...POSITION_INCLUDE,
  childPositions: {
    orderBy: CHILDREN_ORDER,
    include: {
      ...POSITION_INCLUDE,
      childPositions: {
        orderBy: CHILDREN_ORDER,
        include: {
          ...POSITION_INCLUDE,
          childPositions: {
            orderBy: CHILDREN_ORDER,
            include: POSITION_INCLUDE,
          },
        },
      },
    },
  },
} satisfies Prisma.EventPositionInclude;

/** See `TEMPLATE_POSITION_INCLUDE` */
export const TEMPLATE_POSITION_TREE_INCLUDE = {
  ...TEMPLATE_POSITION_INCLUDE,
  childPositions: {
    orderBy: CHILDREN_ORDER,
    include: {
      ...TEMPLATE_POSITION_INCLUDE,
      childPositions: {
        orderBy: CHILDREN_ORDER,
        include: {
          ...TEMPLATE_POSITION_INCLUDE,
          childPositions: {
            orderBy: CHILDREN_ORDER,
            include: TEMPLATE_POSITION_INCLUDE,
          },
        },
      },
    },
  },
} satisfies Prisma.EventPositionInclude;
