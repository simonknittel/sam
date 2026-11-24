import type { Prisma } from "@sam-monorepo/database/client";
import {
  buildPositionTree,
  eventContainerColumns,
  type EventContainer,
  type EventContainerColumns,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import {
  clonePositions,
  findClonablePositions,
} from "../lineup/lineupClone.js";
import {
  copyBriefingTree,
  findBriefingCopySource,
} from "../wiki/briefingCopy.js";

/**
 * For an interactive transaction that writes many rows one after the other. The
 * default of Prisma (5 seconds) is possibly too short for this (an assumption,
 * not measured). The transaction can include a copy of an upload (see
 * `copyUploadInTransaction()`).
 */
export const LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS = 30_000;

/** No permission check: the caller checks the container */
export const loadContainerCopySource = async (
  context: Pick<ApplicationContext, "prisma">,
  columns: EventContainerColumns,
) => {
  const [positions, briefing] = await Promise.all([
    findClonablePositions(context, columns),
    findBriefingCopySource(context, columns),
  ]);

  return {
    positionTree: buildPositionTree(positions),
    briefingPages: briefing.pages,
    /** Null without a root page: then there is no briefing */
    rootPage: briefing.rootPage,
  };
};

type ContainerCopySource = Awaited<ReturnType<typeof loadContainerCopySource>>;

/**
 * The lineup goes first, so that the POSITION scopes of the pages can be
 * remapped onto the new positions
 */
export const copyContainerContent = async (
  transaction: Prisma.TransactionClient,
  source: Pick<ContainerCopySource, "positionTree" | "briefingPages">,
  targetContainer: EventContainer,
  citizenId: string,
) => {
  const positionIdBySourceId = await clonePositions(
    transaction,
    source.positionTree,
    {
      columns: eventContainerColumns(targetContainer),
      parentPositionId: null,
      startOrder: 0,
    },
  );

  const { pageCount } =
    source.briefingPages.length > 0
      ? await copyBriefingTree(transaction, {
          sourcePages: source.briefingPages,
          targetContainer,
          createdByEntityId: citizenId,
          positionIdBySourceId,
        })
      : { pageCount: 0 };

  return { positionCount: positionIdBySourceId.size, pageCount };
};
