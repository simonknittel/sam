import { AuditEventType, ReadMarkerSubject } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { READ_MARKER_SUBJECT_RULES } from "./readMarkerSubjects.js";

/** The longest changelog key has 64 characters (2026-11) */
const MAXIMUM_SUBJECT_ID_LENGTH = 100;

/**
 * The keys of the changelog entries have more characters than the ids (for
 * example umlauts). The rule of the subject type checks that the item exists.
 */
export const readMarkerSubjectIdSchema = z
  .string()
  .min(1)
  .max(MAXIMUM_SUBJECT_ID_LENGTH);

export interface ReadMarkerItem {
  readonly subject: ReadMarkerSubject;
  readonly subjectId: string;
}

interface WrittenReadMarkers {
  /** The items which were new for the actor before the write */
  readonly newIds: string[];
  /** The items which got their first marker of the actor */
  readonly createdIds: string[];
}

/**
 * Repeated calls change nothing. The caller has already checked the permission
 * and the visibility, and writes the audit event: a single read and a batch
 * have different events.
 */
export const writeReadMarkers = async (
  context: ApplicationContext,
  actor: Actor,
  subject: ReadMarkerSubject,
  readableIds: readonly string[],
): Promise<WrittenReadMarkers> => {
  const citizenId = requireCitizen(actor).id;
  if (readableIds.length === 0) return { newIds: [], createdIds: [] };

  const rule = READ_MARKER_SUBJECT_RULES[subject];

  /**
   * Read before the write: after the write the items are never new. A marker
   * that a different tab wrote before this read makes its item not new.
   */
  const newIds = await rule.findNewIds(context, actor, readableIds);

  const markers = await context.prisma.readMarker.createManyAndReturn({
    data: readableIds.map((subjectId) => ({
      citizenId,
      readAt: context.now(),
      [rule.markerColumn]: subjectId,
    })),
    skipDuplicates: true,
  });

  return {
    newIds,
    createdIds: markers.flatMap((marker) => marker[rule.markerColumn] ?? []),
  };
};

export const auditCreatedReadMarkers = async (
  context: ApplicationContext,
  actor: Actor,
  createdItems: readonly ReadMarkerItem[],
) => {
  const citizenId = requireCitizen(actor).id;
  const [firstItem, ...otherItems] = createdItems;
  if (!firstItem) return;

  await context.audit.create([
    otherItems.length === 0
      ? {
          type: AuditEventType.READ_MARKER_CREATED,
          data: {
            citizenId,
            subject: firstItem.subject,
            subjectId: firstItem.subjectId,
          },
          createdById: actor.userId,
        }
      : {
          type: AuditEventType.READ_MARKERS_CREATED,
          data: { citizenId, markers: [...createdItems] },
          createdById: actor.userId,
        },
  ]);
};

interface MarkedReadableItems {
  readonly readableItems: ReadMarkerItem[];
  readonly newItems: ReadMarkerItem[];
}

export const markReadableItemsAsRead = async (
  context: ApplicationContext,
  actor: Actor,
  items: readonly ReadMarkerItem[],
): Promise<MarkedReadableItems> => {
  const readableItems: ReadMarkerItem[] = [];
  const newItems: ReadMarkerItem[] = [];
  const createdItems: ReadMarkerItem[] = [];

  for (const subject of Object.values(ReadMarkerSubject)) {
    const rule = READ_MARKER_SUBJECT_RULES[subject];
    if (!rule.canReadSubject(actor)) continue;

    const subjectIds = [
      ...new Set(
        items
          .filter((item) => item.subject === subject)
          .map((item) => item.subjectId),
      ),
    ];
    if (subjectIds.length === 0) continue;

    const readableIds = await rule.findReadableIds(context, actor, subjectIds);
    const { newIds, createdIds } = await writeReadMarkers(
      context,
      actor,
      subject,
      readableIds,
    );

    const toItem = (subjectId: string) => ({ subject, subjectId });
    readableItems.push(...readableIds.map(toItem));
    newItems.push(...newIds.map(toItem));
    createdItems.push(...createdIds.map(toItem));
  }

  await auditCreatedReadMarkers(context, actor, createdItems);

  return { readableItems, newItems };
};
