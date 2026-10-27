import {
  ACTIVE_CITIZEN_WHERE,
  MAXIMUM_CITIZEN_LIST_ROLE_FILTERS,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { pageLimitSchema } from "../pagination.js";
import { isRoleVisible } from "../roles/roleVisibility.js";
import { withSpan } from "../withSpan.js";

/**
 * The roles of a citizen that the actor can see. The level of an assignment
 * does not matter, like on the role badges of the app.
 */
const getVisibleRoleIds = (
  actor: Actor,
  roleAssignments: readonly { readonly roleId: string }[],
) =>
  roleAssignments
    .map((roleAssignment) => roleAssignment.roleId)
    .filter((roleId) => isRoleVisible(actor, roleId));

export enum CitizenUnknownAttribute {
  Handle = "handle",
  DiscordId = "discord_id",
  TeamspeakId = "teamspeak_id",
}

export enum CitizenListSort {
  HandleAscending = "handle_asc",
  HandleDescending = "handle_desc",
  CreatedAscending = "created_asc",
  CreatedDescending = "created_desc",
  LastSeenAscending = "last_seen_asc",
  LastSeenDescending = "last_seen_desc",
}

export const CITIZEN_LIST_DEFAULT_SORT = CitizenListSort.CreatedDescending;

/** Role ids are cuids. The limits only refuse input that is too large. */
const MAXIMUM_ROLE_ID_LENGTH = 64;

export const listCitizensInputSchema = z.object({
  role_ids: z
    .array(z.string().max(MAXIMUM_ROLE_ID_LENGTH))
    .max(MAXIMUM_CITIZEN_LIST_ROLE_FILTERS)
    .default([])
    .describe("Only the citizens with at least one of these roles."),
  unknown: z
    .array(z.enum(CitizenUnknownAttribute))
    .max(Object.values(CitizenUnknownAttribute).length)
    .default([])
    .describe("Only the citizens without at least one of these values."),
  sort: z.enum(CitizenListSort).default(CITIZEN_LIST_DEFAULT_SORT),
  page: z.int().min(1).default(1).describe("The page, from 1."),
  limit: pageLimitSchema,
});

export interface CitizenListItem {
  readonly id: string;
  /** Display text. It can change and it does not identify the citizen. */
  readonly handle: string | null;
  readonly spectrum_id: string | null;
  /** Null also without `discord-id;read` */
  readonly discord_id: string | null;
  /** Null also without `teamspeak-id;read` */
  readonly teamspeak_id: string | null;
  readonly created_at: string;
  /** Null also without `lastSeen;read` */
  readonly last_seen_at: string | null;
  /** The assigned roles that the actor can see */
  readonly role_ids: string[];
}

export interface ListCitizensOutput {
  readonly citizens: CitizenListItem[];
  readonly total: number;
  readonly page: number;
  readonly page_count: number;
}

type SortValue = string | number | null;

/** Compares ascending and puts null values last */
const compareAscending = (first: SortValue, second: SortValue): number => {
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;

  if (typeof first === "string" && typeof second === "string")
    return first.localeCompare(second);
  if (typeof first === "number" && typeof second === "number")
    return first - second;

  return 0;
};

/** Compares descending and also puts null values last */
const compareDescending = (first: SortValue, second: SortValue) =>
  first === null || second === null
    ? compareAscending(first, second)
    : compareAscending(second, first);

const isLastSeenSort = (sort: CitizenListSort) =>
  sort === CitizenListSort.LastSeenAscending ||
  sort === CitizenListSort.LastSeenDescending;

interface Row {
  readonly id: string;
  readonly handle: string | null;
  readonly spectrumId: string | null;
  readonly discordId: string | null;
  readonly teamspeakId: string | null;
  readonly createdAt: Date;
  readonly lastSeenAt: Date | null;
  readonly roleAssignments: readonly { readonly roleId: string }[];
}

const compareRows = (sort: CitizenListSort) => (first: Row, second: Row) => {
  switch (sort) {
    case CitizenListSort.HandleAscending:
      return compareAscending(first.handle, second.handle);
    case CitizenListSort.HandleDescending:
      return compareDescending(first.handle, second.handle);

    case CitizenListSort.CreatedAscending:
      return compareAscending(
        first.createdAt.getTime(),
        second.createdAt.getTime(),
      );
    case CitizenListSort.CreatedDescending:
      return compareDescending(
        first.createdAt.getTime(),
        second.createdAt.getTime(),
      );

    case CitizenListSort.LastSeenAscending:
      return compareAscending(
        first.lastSeenAt?.getTime() ?? null,
        second.lastSeenAt?.getTime() ?? null,
      );
    case CitizenListSort.LastSeenDescending:
      return compareDescending(
        first.lastSeenAt?.getTime() ?? null,
        second.lastSeenAt?.getTime() ?? null,
      );

    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

const hasUnknownAttribute = (
  row: Row,
  unknownAttributes: readonly CitizenUnknownAttribute[],
) =>
  unknownAttributes.length === 0 ||
  unknownAttributes.some((attribute) => {
    switch (attribute) {
      case CitizenUnknownAttribute.Handle:
        return !row.handle;
      case CitizenUnknownAttribute.DiscordId:
        return !row.discordId;
      case CitizenUnknownAttribute.TeamspeakId:
        return !row.teamspeakId;
      default:
        throw new Error(`Unknown attribute: ${attribute satisfies never}`);
    }
  });

/**
 * One page of the citizens table of the Spynet: the citizens that are not
 * deleted, filtered by their visible roles and by missing values, and
 * sorted. The filters and the sort run in memory, because the role filter
 * depends on the permissions of the actor.
 */
export const listCitizens = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.output<typeof listCitizensInputSchema>,
): Promise<ListCitizensOutput> => {
  requirePermission(actor, "citizen", "read");
  requirePermission(actor, "spynetCitizen", "read");

  const canReadLastSeen = actor.authorize("lastSeen", "read");
  const canReadDiscordId = actor.authorize("discord-id", "read");
  const canReadTeamspeakId = actor.authorize("teamspeak-id", "read");

  /**
   * A filter by a value that the actor cannot read would show which
   * citizens have one, thus the use case ignores it
   */
  const unknownAttributes = input.unknown.filter(
    (attribute) =>
      (attribute !== CitizenUnknownAttribute.DiscordId || canReadDiscordId) &&
      (attribute !== CitizenUnknownAttribute.TeamspeakId || canReadTeamspeakId),
  );

  /** Without the permission, the time of the last visit is no sort option */
  const sort =
    !canReadLastSeen && isLastSeenSort(input.sort)
      ? CITIZEN_LIST_DEFAULT_SORT
      : input.sort;

  return withSpan(context, "listCitizens", async () => {
    const citizens = await context.prisma.citizen.findMany({
      where: ACTIVE_CITIZEN_WHERE,
      select: {
        id: true,
        handle: true,
        spectrumId: true,
        discordId: true,
        teamspeakId: true,
        createdAt: true,
        roleAssignments: { select: { roleId: true } },
        user: { select: { lastSeenAt: true } },
      },
    });

    const rows: Row[] = citizens.map(({ user, ...citizen }) => ({
      ...citizen,
      lastSeenAt: canReadLastSeen ? (user?.lastSeenAt ?? null) : null,
    }));

    const sortedRows = rows
      .filter(
        (row) =>
          hasUnknownAttribute(row, unknownAttributes) &&
          (input.role_ids.length === 0 ||
            getVisibleRoleIds(actor, row.roleAssignments).some((roleId) =>
              input.role_ids.includes(roleId),
            )),
      )
      .toSorted(compareRows(sort));

    const start = (input.page - 1) * input.limit;

    return {
      citizens: sortedRows.slice(start, start + input.limit).map((row) => ({
        id: row.id,
        handle: row.handle,
        spectrum_id: row.spectrumId,
        discord_id: canReadDiscordId ? row.discordId : null,
        teamspeak_id: canReadTeamspeakId ? row.teamspeakId : null,
        created_at: row.createdAt.toISOString(),
        last_seen_at: row.lastSeenAt?.toISOString() ?? null,
        role_ids: getVisibleRoleIds(actor, row.roleAssignments),
      })),
      total: sortedRows.length,
      page: input.page,
      page_count: Math.ceil(sortedRows.length / input.limit),
    };
  });
};
