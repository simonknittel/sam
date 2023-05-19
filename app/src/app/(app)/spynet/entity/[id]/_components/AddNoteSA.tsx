import { type Entity } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { authenticateAndAuthorizeApi } from "~/app/_utils/authenticateAndAuthorize";
import { prisma } from "~/server/db";
import AddNoteSubmitSA from "./AddNoteSubmitSA";

const schema = zfd.formData({
  content: zfd.text(z.string().trim().min(1)),
  entityId: zfd.text(),
});

interface Props {
  entity: Entity;
}

const AddNoteSA = ({ entity }: Props) => {
  async function addNote(formData: FormData) {
    "use server";

    const session = await authenticateAndAuthorizeApi("add-note");

    const { content, entityId } = await schema.parseAsync(formData);

    await prisma.entityLog.create({
      data: {
        type: "note",
        content,
        submittedBy: {
          connect: {
            id: session.user.id,
          },
        },
        entity: {
          connect: {
            id: entityId,
          },
        },
      },
    });

    revalidatePath(`/spynet/entity/${entityId}`);

    // TODO: Add success and error handling
  }

  return (
    <form action={addNote} className="flex mt-4">
      <textarea
        className="p-2 rounded-l bg-neutral-800 flex-1"
        name="content"
        autoFocus
        placeholder="Notiz hinzufügen ..."
        required
      />

      <input type="hidden" name="entityId" value={entity.id} required />

      <div>
        <AddNoteSubmitSA />
      </div>
    </form>
  );
};

export default AddNoteSA;
