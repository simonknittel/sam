import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { paginateByCursor, type PageOptions } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { VARIANT_MANUFACTURER_SELECT } from "./catalogRows.js";

const SHIP_CHANGES_PAGE_SIZE = 100;

export enum ShipChangeType {
  Creation = "creation",
  Deletion = "deletion",
}

export enum ShipChangeFilter {
  Both = "both",
  Creation = "creation",
  Deletion = "deletion",
}

const CHANGED_SHIP_SELECT = {
  id: true,
  name: true,
  acquisitionSource: true,
  note: true,
  createdAt: true,
  deletedAt: true,
  variant: {
    select: {
      id: true,
      name: true,
      status: true,
      ...VARIANT_MANUFACTURER_SELECT,
    },
  },
} as const satisfies Prisma.ShipSelect;

export interface ShipChangeRow {
  readonly changeDate: Date;
  readonly changeType: ShipChangeType;
  readonly ship: Prisma.ShipGetPayload<{ select: typeof CHANGED_SHIP_SELECT }>;
  readonly actor: CitizenReferenceRow | null;
}

export interface ShipChangePage {
  readonly changes: ShipChangeRow[];
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

const getChangeCursor = (change: ShipChangeRow) =>
  `${change.ship.id}:${change.changeType}`;

export const findShipChangePage = (
  context: Pick<ApplicationContext, "prisma" | "tracer">,
  actor: Actor,
  {
    changeType,
    cursor,
  }: {
    readonly changeType: ShipChangeFilter;
    /** See `getChangeCursor()` */
    readonly cursor?: string | null;
  },
  { direction, unknownCursor }: PageOptions = {},
): Promise<ShipChangePage> =>
  withSpan(context, "findShipChangePage", async () => {
    requirePermission(actor, "otherShips", "read");

    /**
     * Without a cursor, the answer is the newest page of the merged streams.
     * A row can be on this page only when it is on the newest page of its
     * own stream, thus each query stops there. A page with a cursor can be
     * at any depth of each stream, and the cursor (`shipId:changeType`)
     * points into the merged list, not into one stream. Thus such a page
     * merges all rows in memory.
     */
    const streamTake = cursor ? undefined : SHIP_CHANGES_PAGE_SIZE + 1;

    const [createdShips, deletedShips] = await Promise.all([
      changeType === ShipChangeFilter.Deletion
        ? []
        : context.prisma.ship.findMany({
            where: {
              deletedAt: null,
              /** A ship without a creation date has no place in the timeline */
              createdAt: { not: null },
            },
            orderBy: { createdAt: "desc" },
            take: streamTake,
            select: {
              ...CHANGED_SHIP_SELECT,
              createdBy: { select: CITIZEN_REFERENCE_SELECT },
            },
          }),
      changeType === ShipChangeFilter.Creation
        ? []
        : context.prisma.ship.findMany({
            where: { deletedAt: { not: null } },
            orderBy: { deletedAt: "desc" },
            take: streamTake,
            select: {
              ...CHANGED_SHIP_SELECT,
              deletedBy: { select: CITIZEN_REFERENCE_SELECT },
            },
          }),
    ]);

    /**
     * The queries only load ships with a date. The checks below tell this
     * to TypeScript without an assertion.
     */
    const changes: ShipChangeRow[] = [
      ...createdShips.flatMap(({ createdBy, ...ship }) =>
        ship.createdAt
          ? [
              {
                changeDate: ship.createdAt,
                changeType: ShipChangeType.Creation,
                ship,
                actor: createdBy,
              },
            ]
          : [],
      ),
      ...deletedShips.flatMap(({ deletedBy, ...ship }) =>
        ship.deletedAt
          ? [
              {
                changeDate: ship.deletedAt,
                changeType: ShipChangeType.Deletion,
                ship,
                actor: deletedBy,
              },
            ]
          : [],
      ),
    ];

    const sortedChanges = changes.toSorted(
      (first, second) =>
        second.changeDate.getTime() - first.changeDate.getTime(),
    );

    const page = paginateByCursor(sortedChanges, {
      cursor,
      direction,
      unknownCursor,
      pageSize: SHIP_CHANGES_PAGE_SIZE,
      getCursor: getChangeCursor,
    });

    return {
      changes: page.items,
      nextCursor: page.nextCursor,
      prevCursor: page.previousCursor,
    };
  });
