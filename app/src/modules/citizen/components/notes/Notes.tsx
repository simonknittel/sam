import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import {
  type Entity,
  type EntityLog,
  type EntityLogAttribute,
  type NoteType,
} from "@prisma/client";
import clsx from "clsx";
import { NoteTypePanel } from "./NoteTypePanel";
import isAllowedToRead from "./lib/isAllowedToRead";
import isAllowedToReadRedacted from "./lib/isAllowedToReadRedacted";

interface Props {
  readonly className?: string;
  readonly entity: Entity;
}

export const Notes = async ({ className, entity }: Props) => {
  const authentication = await requireAuthentication();

  const [notes, allNoteTypes] = await prisma.$transaction([
    prisma.entityLog.findMany({
      where: {
        entityId: entity.id,
        type: "note",
      },
      include: {
        attributes: {
          include: {
            createdBy: true,
          },
        },
        submittedBy: true,
      },
    }),

    prisma.noteType.findMany(),
  ]);

  const sortedNotes = notes.toSorted(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const tabs: Record<
    NoteType["id"],
    (
      | (EntityLog & { attributes: EntityLogAttribute[] })
      | {
          id: EntityLog["id"];
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
    <section
      className={clsx(className, "rounded-primary p-4 background-secondary")}
    >
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
