import type { Prisma } from "@sam-monorepo/database/client";

/** Everything the lineup renders for one position, without its children */
const POSITION_INCLUDE = {
  applications: {
    include: {
      citizen: true,
    },
  },
  citizen: true,
  requiredVariants: {
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
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  },
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
