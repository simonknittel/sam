import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  CITIZEN_NOTE_SELECT,
  type CitizenNote,
} from "@/modules/citizen/queries/citizenLogTableSelect";
import getLatestNoteAttributes from "@/modules/citizen/utils/getLatestNoteAttributes";
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

export const Notes = async ({ className, entity }: Props) => {
  const authentication = await requireAuthentication();

  const [notes, allNoteTypes] = await prisma.$transaction([
    prisma.citizenLog.findMany({
      where: {
        entityId: entity.id,
        type: "note",
      },
      select: CITIZEN_NOTE_SELECT,
    }),

    prisma.noteType.findMany(),
  ]);

  const sortedNotes = notes.toSorted(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const tabs: Record<
    NoteType["id"],
    (
      | CitizenNote
      | {
          id: CitizenLog["id"];
          redacted: true;
        }
    )[]
  > = {};

  for (const note of sortedNotes) {
    const latestNoteAttributes = getLatestNoteAttributes(note);

    if (!latestNoteAttributes.noteTypeId) continue;

    if (!(await isAllowedToRead(note, authentication))) {
      if (!(await isAllowedToReadRedacted(note, authentication))) continue;

      if (!tabs[latestNoteAttributes.noteTypeId.value])
        tabs[latestNoteAttributes.noteTypeId.value] = [];

      tabs[latestNoteAttributes.noteTypeId.value].push({
        id: note.id,
        redacted: true,
      });

      continue;
    }

    if (!tabs[latestNoteAttributes.noteTypeId.value])
      tabs[latestNoteAttributes.noteTypeId.value] = [];

    tabs[latestNoteAttributes.noteTypeId.value].push(note);
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
    <section className={clsx(className, "rounded-primary p-4 bg-secondary")}>
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
