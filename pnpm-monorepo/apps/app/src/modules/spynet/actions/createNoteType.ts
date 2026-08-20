"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const createNoteType = createAuthenticatedAction(
  "createNoteType",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("noteType", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const noteType = await prisma.noteType.create({
      data: {
        name: data.name,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.NOTE_TYPE_CREATED,
        data: {
          noteTypeId: noteType.id,
          name: noteType.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/spynet/settings");

    return {
      success: "Erfolgreich hinzugefügt",
    };
  },
);
