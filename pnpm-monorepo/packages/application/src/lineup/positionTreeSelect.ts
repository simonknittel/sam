import type { Prisma } from "@sam-monorepo/database/client";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";

/**
 * The variant catalog of one position, down to the manufacturer logo the
 * lineup renders. The logo is a `VariantWithLogo`, which is exactly
 * `Pick<Upload, "id" | "mimeType">`.
 */
const REQUIRED_VARIANTS_SELECT = {
  orderBy: {
    order: "asc",
  },
  select: {
    id: true,
    variantId: true,
    variant: {
      select: {
        id: true,
        name: true,
        series: {
          select: {
            manufacturer: {
              select: {
                name: true,
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
 * the viewer can see from the roles context. The order is the order of the
 * role picker.
 */
const REQUIRED_ROLES_SELECT = {
  select: { roleId: true },
  orderBy: { role: { name: "asc" } },
} as const satisfies Prisma.EventPosition$requiredRolesArgs;

/**
 * Everything the lineup of a template blueprint renders for one position,
 * without its children. A template position can never have an assigned
 * citizen or applications. The editor sends `order` back when it moves a
 * position.
 */
const TEMPLATE_POSITION_SELECT = {
  id: true,
  name: true,
  description: true,
  order: true,
  requiredRoleMatch: true,
  fontSize: true,
  backgroundColor: true,
  textColor: true,
  requiredVariants: REQUIRED_VARIANTS_SELECT,
  requiredRoles: REQUIRED_ROLES_SELECT,
} as const satisfies Prisma.EventPositionSelect;

/**
 * Everything the lineup of an event renders for one position, without its
 * children. Citizens appear as `CitizenLink`s, so they are joined with
 * `CITIZEN_REFERENCE_SELECT` rather than as full Citizen rows with their
 * Discord and Teamspeak ids and SILC balances — the whole tree is serialized
 * into client components.
 */
const POSITION_SELECT = {
  ...TEMPLATE_POSITION_SELECT,
  applications: {
    select: {
      citizen: { select: CITIZEN_REFERENCE_SELECT },
    },
  },
  citizen: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.EventPositionSelect;

const CHILDREN_ORDER = { order: "asc" } as const;

/**
 * The nested lineup of an event as the editor renders it, four levels deep —
 * the depth `LINEUP_MAX_DEPTH` of the domain package. The lineup of a
 * template blueprint uses `TEMPLATE_POSITION_TREE_SELECT`.
 */
export const POSITION_TREE_SELECT = {
  ...POSITION_SELECT,
  childPositions: {
    orderBy: CHILDREN_ORDER,
    select: {
      ...POSITION_SELECT,
      childPositions: {
        orderBy: CHILDREN_ORDER,
        select: {
          ...POSITION_SELECT,
          childPositions: {
            orderBy: CHILDREN_ORDER,
            select: POSITION_SELECT,
          },
        },
      },
    },
  },
} as const satisfies Prisma.EventPositionSelect;

/** See `TEMPLATE_POSITION_SELECT` */
export const TEMPLATE_POSITION_TREE_SELECT = {
  ...TEMPLATE_POSITION_SELECT,
  childPositions: {
    orderBy: CHILDREN_ORDER,
    select: {
      ...TEMPLATE_POSITION_SELECT,
      childPositions: {
        orderBy: CHILDREN_ORDER,
        select: {
          ...TEMPLATE_POSITION_SELECT,
          childPositions: {
            orderBy: CHILDREN_ORDER,
            select: TEMPLATE_POSITION_SELECT,
          },
        },
      },
    },
  },
} as const satisfies Prisma.EventPositionSelect;
