import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  requireLogAnalyzerAccess,
  type LogAnalyzerSharingOptions,
} from "./logAnalyzerAccess.js";
import { getEventAtWindow } from "./logAnalyzerWindow.js";

/**
 * The upper limit of one response. A citizen with a longer history pages
 * through more than one request, thus the answer stays complete at any size —
 * a cap without paging would let the entries above it be uploaded again on
 * every page load.
 */
const MAXIMUM_HASHES_PER_REQUEST = 2000;

export interface FindOwnLogAnalyzerEntryHashesInput {
  /** 0 loads without a time limit */
  readonly daysToLoad: number;
  readonly cursorHash?: string | undefined;
}

export interface OwnLogAnalyzerEntryHashes {
  readonly hashes: string[];
  /** Null ends the paging */
  readonly cursorHash: string | null;
}

interface EventAtFilter {
  readonly gte?: Date | undefined;
  readonly lt?: Date | undefined;
}

/**
 * Only hashes leave the server: they identify an entry for the unique index
 * without the raw log line, which holds data of other players.
 *
 * The cursor runs along the hash. It is unique per citizen, thus it orders the
 * rows without a tiebreaker and the unique index serves the paging.
 */
export const findOwnLogAnalyzerEntryHashPage = async (
  context: ApplicationContext,
  actor: Actor,
  eventAt: EventAtFilter | undefined,
  cursorHash: string | undefined,
  options: LogAnalyzerSharingOptions,
): Promise<OwnLogAnalyzerEntryHashes> => {
  requireLogAnalyzerAccess(actor, options);

  /** Without a linked citizen the upload refuses the entries too */
  if (!actor.citizen) return { hashes: [], cursorHash: null };
  const citizenId = actor.citizen.id;

  const entries = await context.prisma.logAnalyzerEntry.findMany({
    where: { createdById: citizenId, eventAt },
    orderBy: { hash: "asc" },
    ...(cursorHash
      ? {
          cursor: {
            createdById_hash: { createdById: citizenId, hash: cursorHash },
          },
          skip: 1,
        }
      : undefined),
    take: MAXIMUM_HASHES_PER_REQUEST,
    select: { hash: true },
  });
  const hashes = entries.map((entry) => entry.hash);

  const nextCursorHash =
    hashes.length < MAXIMUM_HASHES_PER_REQUEST ? null : (hashes.at(-1) ?? null);

  return { hashes, cursorHash: nextCursorHash };
};

/**
 * The client hashes what it parsed from the local log files and sends only what
 * is missing here
 */
export const findOwnLogAnalyzerEntryHashes = (
  context: ApplicationContext,
  actor: Actor,
  input: FindOwnLogAnalyzerEntryHashesInput,
  options: LogAnalyzerSharingOptions,
) =>
  findOwnLogAnalyzerEntryHashPage(
    context,
    actor,
    getEventAtWindow(input.daysToLoad, context.now()),
    input.cursorHash,
    options,
  );
