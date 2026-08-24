import type { Prisma } from "@sam-monorepo/database/client";

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
 * Everything the lineup renders for one position, without its children.
 * Citizens appear as `CitizenLink`s, so they are joined as {id, handle}
 * rather than as full Entity rows with their Discord and Teamspeak ids and
 * SILC balances — the whole tree is serialized into client components.
 */
const POSITION_INCLUDE = {
  applications: {
    include: {
      citizen: { select: { id: true, handle: true } },
    },
  },
  citizen: { select: { id: true, handle: true } },
  requiredVariants: REQUIRED_VARIANTS_INCLUDE,
} satisfies Prisma.EventPositionInclude;

/**
 * The same shape for a template blueprint, whose positions can never have
 * an assigned citizen or applications — those two joins would always
 * resolve to nothing.
 */
const TEMPLATE_POSITION_INCLUDE = {
  requiredVariants: REQUIRED_VARIANTS_INCLUDE,
} satisfies Prisma.EventPositionInclude;

const CHILDREN_ORDER = { order: "asc" } as const;

/**
 * The nested lineup as the editor renders it, four levels deep — the depth
 * `MAX_LINEUP_DEPTH` documents. Shared by the event lineup and the lineup of
 * a template blueprint, which store their positions in the same table.
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
