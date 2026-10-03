import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  CITIZEN_NOTE_SELECT,
  type CitizenNote,
} from "@/modules/citizen/queries/citizenLogTableSelect";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import {
  type Citizen,
  type CitizenLog,
  type NoteType,
} from "@sam-monorepo/database/client";
import clsx from "clsx";
import { NoteTypePanel } from "./NoteTypePanel";
import isAllowedToRead from "./lib/isAllowedToRead";
import isAllowedToReadRedacted from "./lib/isAllowedToReadRedacted";

interface Props {
  readonly className?: string;
  readonly entity: Pick<Citizen, "id">;
}

type VisibleNote = CitizenNote | { id: CitizenLog["id"]; redacted: true };

export const Notes = async ({ className, entity }: Props) => {
  const authentication = await requireAuthentication();

  /**
   * Each note shows in the tab of its note type, thus a note of a deleted
   * note type does not show
   */
  const allNoteTypes = await prisma.noteType.findMany({
    select: {
      id: true,
      name: true,
      citizenLogs: {
        where: {
          citizenId: entity.id,
          type: "note",
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: CITIZEN_NOTE_SELECT,
      },
    },
  });

  const tabs: Record<NoteType["id"], VisibleNote[]> = {};

  for (const noteType of allNoteTypes) {
    const notes: VisibleNote[] = [];

    for (const note of noteType.citizenLogs) {
      if (await isAllowedToRead(note, authentication)) notes.push(note);
      else if (await isAllowedToReadRedacted(note, authentication))
        notes.push({ id: note.id, redacted: true });
    }

    tabs[noteType.id] = notes;
  }

  const filteredNoteTypes = (
    await Promise.all(
      allNoteTypes.map(async (noteType) => {
        return {
          noteType,
          include:
            (await authentication.authorize("note", "read", [
              {
                key: "noteTypeId",
                value: noteType.id,
              },
            ])) ||
            (await authentication.authorize("note", "readRedacted", [
              {
                key: "noteTypeId",
                value: noteType.id,
              },
            ])) ||
            (await authentication.authorize("note", "create", [
              {
                key: "noteTypeId",
                value: noteType.id,
              },
            ])),
        };
      }),
    )
  )
    .filter(({ include }) => include)
    .map(({ noteType }) => noteType);

  if (filteredNoteTypes.length <= 0) return null;

  return (
    <section className={clsx(className, "rounded-primary bg-secondary p-4")}>
      <TabsProvider initialActiveTab={filteredNoteTypes[0].id}>
        <TabList>
          {filteredNoteTypes.map((noteType) => (
            <Tab key={noteType.id} id={noteType.id}>
              {noteType.name}
            </Tab>
          ))}
        </TabList>

        {filteredNoteTypes.map((noteType) => (
          <NoteTypePanel
            key={noteType.id}
            noteType={noteType}
            notes={tabs[noteType.id] || []}
            entityId={entity.id}
          />
        ))}
      </TabsProvider>
    </section>
  );
};
