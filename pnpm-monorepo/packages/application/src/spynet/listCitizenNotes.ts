import { ConfirmationStatus } from "@sam-monorepo/database/browser";
import {
  ACTIVE_CITIZEN_WHERE,
  buildCursorConditions,
  CursorDirection,
  cursorOrderBy,
  decodeCursor,
  encodeCursor,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  toCitizenReference,
  type CitizenReference,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { cursorSchema, idSchema, pageLimitSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { CitizenErrorMessage } from "./citizenErrors.js";
import { canReadNote, canReadNoteRedacted } from "./notePermissions.js";
import {
  getNoteClassificationConditions,
  loadNoteClassifications,
} from "./readableCitizenLogWhere.js";

export const listCitizenNotesInputSchema = z.object({
  citizen_id: idSchema,
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export enum CitizenNoteConfirmation {
  Confirmed = "confirmed",
  FalseReport = "false_report",
  /** Nobody decided about the note yet */
  Pending = "pending",
}

export interface NamedReference {
  readonly id: string;
  readonly name: string;
}

export interface ReadableCitizenNote {
  readonly redacted: false;
  readonly id: string;
  readonly note_type: NamedReference;
  /**
   * Null only when the classification level is deleted during the read: the
   * list leaves out the notes of a deleted level
   */
  readonly classification_level: NamedReference | null;
  readonly confirmed: CitizenNoteConfirmation;
  /** Null without `spynetNotes;read` */
  readonly confirmed_at: string | null;
  readonly created_at: string;
  /** Null when it is unknown or deleted, and without `spynetNotes;read` */
  readonly created_by: CitizenReference | null;
  readonly content: string | null;
}

/** The notes page shows only the note type of such a note */
export interface RedactedCitizenNote {
  readonly redacted: true;
  readonly id: string;
  readonly note_type: NamedReference;
}

export type CitizenNoteOutput = ReadableCitizenNote | RedactedCitizenNote;

export interface ListCitizenNotesOutput {
  readonly notes: CitizenNoteOutput[];
  readonly next_cursor: string | null;
}

/** The notes are the only source of the merged cursor of the list */
const NOTE_CURSOR_SOURCE_KEY = "note";

const toConfirmation = (confirmed: ConfirmationStatus | null) => {
  switch (confirmed) {
    case ConfirmationStatus.CONFIRMED:
      return CitizenNoteConfirmation.Confirmed;

    case ConfirmationStatus.FALSE_REPORT:
      return CitizenNoteConfirmation.FalseReport;

    case null:
      return CitizenNoteConfirmation.Pending;

    default:
      throw new Error(`Unknown confirmation: ${confirmed satisfies never}`);
  }
};

/** Notes of a deleted note type or classification level do not show */
export const listCitizenNotes = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.output<typeof listCitizenNotesInputSchema>,
): Promise<ListCitizenNotesOutput> => {
  requirePermission(actor, "citizen", "read");

  const position = decodeCursor(input.cursor);
  if (
    input.cursor &&
    (!position || position.sourceKey !== NOTE_CURSOR_SOURCE_KEY)
  )
    throw new ValidationError("Unknown cursor");

  /**
   * Only the notes page of Spynet shows the author and the confirmation time.
   * The notes tab of a citizen needs only `citizen;read` and does not show
   * them.
   */
  const canSeeAuthorAndConfirmationTime = actor.authorize(
    "spynetNotes",
    "read",
  );

  return withSpan(context, "listCitizenNotes", async () => {
    const [citizen, classifications] = await Promise.all([
      context.prisma.citizen.findFirst({
        where: { id: input.citizen_id, ...ACTIVE_CITIZEN_WHERE },
        select: { id: true },
      }),
      loadNoteClassifications(context),
    ]);
    if (!citizen) throw new NotFoundError(CitizenErrorMessage.NotFound);

    const visibleClassifications = [
      ...getNoteClassificationConditions(actor, "read", classifications),
      ...getNoteClassificationConditions(
        actor,
        "readRedacted",
        classifications,
      ),
    ];

    const notes = await context.prisma.citizenLog.findMany({
      where: {
        AND: [
          {
            citizenId: input.citizen_id,
            type: "note",
            OR: visibleClassifications,
          },
          ...buildCursorConditions(
            position,
            NOTE_CURSOR_SOURCE_KEY,
            CursorDirection.Next,
            "createdAt",
          ),
        ],
      },
      orderBy: cursorOrderBy(CursorDirection.Next, "createdAt"),
      take: input.limit + 1,
      select: {
        id: true,
        content: true,
        createdAt: true,
        confirmed: true,
        confirmedAt: true,
        noteTypeId: true,
        classificationLevelId: true,
        noteType: { select: { id: true, name: true } },
        classificationLevel: { select: { id: true, name: true } },
        submittedBy: {
          select: {
            citizen: { select: CITIZEN_REFERENCE_SELECT },
          },
        },
      },
    });

    const pageNotes = notes.slice(0, input.limit);
    const lastNote = pageNotes.at(-1);

    return {
      notes: pageNotes.flatMap((note): CitizenNoteOutput[] => {
        // The condition of the query makes sure that the note type exists
        if (!note.noteType) return [];

        const noteType = { id: note.noteType.id, name: note.noteType.name };

        if (canReadNote(actor, note))
          return [
            {
              redacted: false,
              id: note.id,
              note_type: noteType,
              classification_level: note.classificationLevel && {
                id: note.classificationLevel.id,
                name: note.classificationLevel.name,
              },
              confirmed: toConfirmation(note.confirmed),
              confirmed_at: canSeeAuthorAndConfirmationTime
                ? (note.confirmedAt?.toISOString() ?? null)
                : null,
              created_at: note.createdAt.toISOString(),
              created_by: canSeeAuthorAndConfirmationTime
                ? toCitizenReference(note.submittedBy?.citizen ?? null)
                : null,
              content: note.content,
            },
          ];

        if (canReadNoteRedacted(actor, note))
          return [{ redacted: true, id: note.id, note_type: noteType }];

        return [];
      }),
      next_cursor:
        notes.length > input.limit && lastNote
          ? encodeCursor({
              date: lastNote.createdAt,
              sourceKey: NOTE_CURSOR_SOURCE_KEY,
              id: lastNote.id,
            })
          : null,
    };
  });
};
