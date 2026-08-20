"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).max(255),
});

export const updateNoteType = createAuthenticatedAction(
  "updateNoteType",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("noteType", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const existingNoteType = await prisma.noteType.findUnique({
      where: { id: data.id },
      select: { name: true },
    });
    if (!existingNoteType)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const noteType = await prisma.noteType.update({
      where: { id: data.id },
      data: {
        name: data.name,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.NOTE_TYPE_UPDATED,
        data: {
          noteTypeId: noteType.id,
          previousName: existingNoteType.name,
          newName: noteType.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/spynet/settings");

    return {
      success: "Erfolgreich bearbeitet",
    };
  },
);
