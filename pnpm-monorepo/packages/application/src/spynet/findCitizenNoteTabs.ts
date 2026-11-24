import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { CITIZEN_NOTE_SELECT, type CitizenNoteRow } from "./citizenNoteRow.js";
import { canReadNote, canReadNoteRedacted } from "./notePermissions.js";

export interface CitizenNoteTabsInput {
  readonly citizenId: string;
}

export interface RedactedCitizenNoteRow {
  readonly id: string;
  readonly redacted: true;
}

export type CitizenNoteTabEntry = CitizenNoteRow | RedactedCitizenNoteRow;

export interface CitizenNoteTab {
  readonly id: string;
  readonly name: string;
  readonly notes: CitizenNoteTabEntry[];
}

/**
 * Each note shows in the tab of its note type, thus a note of a deleted note
 * type does not show
 */
export const findCitizenNoteTabs = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { citizenId }: CitizenNoteTabsInput,
): Promise<CitizenNoteTab[]> => {
  requirePermission(actor, "citizen", "read");

  const noteTypes = await context.prisma.noteType.findMany({
    select: {
      id: true,
      name: true,
      citizenLogs: {
        where: { citizenId, type: "note" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: CITIZEN_NOTE_SELECT,
      },
    },
  });

  return noteTypes.flatMap((noteType): CitizenNoteTab[] => {
    const attributes = [{ key: "noteTypeId" as const, value: noteType.id }];
    if (
      !actor.authorize("note", "read", attributes) &&
      !actor.authorize("note", "readRedacted", attributes) &&
      !actor.authorize("note", "create", attributes)
    )
      return [];

    return [
      {
        id: noteType.id,
        name: noteType.name,
        notes: noteType.citizenLogs.flatMap((note): CitizenNoteTabEntry[] => {
          if (canReadNote(actor, note)) return [note];
          if (canReadNoteRedacted(actor, note))
            return [{ id: note.id, redacted: true }];
          return [];
        }),
      },
    ];
  });
};
