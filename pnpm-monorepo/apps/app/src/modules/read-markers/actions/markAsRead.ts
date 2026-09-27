"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { getUnreadWhere } from "../queries/getUnreadWhere";
import { READ_MARKER_SUBJECTS } from "../utils/readMarkerSubjects";

/** The ids of all subjects (cuid and cuid2) are shorter than this */
const SUBJECT_ID_MAX_LENGTH = 64;

const schema = z.object({
  subject: z.enum(ReadMarkerSubject),
  subjectId: z.string().min(1).max(SUBJECT_ID_MAX_LENGTH),
});

/**
 * Marks one item as read by the viewer: from its details once they mounted
 * in the browser (see `<MarkAsReadOnMount>`), or from a click on its "Neu"
 * marker. Repeated calls change nothing.
 */
export const markAsRead = createAuthenticatedAction(
  "markAsRead",
  schema,
  async (formData, authentication, data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const definition = READ_MARKER_SUBJECTS[data.subject];

    if (!(await authentication.authorize(definition.readResource, "read")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * An item which the viewer cannot see is indistinguishable from one
     * which does not exist
     */
    if (!(await definition.canRead(data.subjectId)))
      return { error: t("Common.notFound"), requestPayload: formData };

    const unreadWhere = await getUnreadWhere(data.subject);
    const wasNew =
      unreadWhere !== null &&
      (await definition.findNewIds([data.subjectId], unreadWhere, new Date()))
        .length > 0;

    const { count } = await prisma.readMarker.createMany({
      data: [{ citizenId, ...definition.markerData(data.subjectId) }],
      skipDuplicates: true,
    });

    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.READ_MARKER_CREATED,
          data: {
            citizenId,
            subject: data.subject,
            subjectId: data.subjectId,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    /**
     * The "new" state shows in lists, tiles and the dot badges of the app
     * layout. The revalidation also clears the client router cache, which
     * would otherwise show the old state on a back navigation. Only a real
     * change is worth the render.
     */
    if (count > 0 && wasNew) revalidatePath("/app", "layout");

    return { success: "Als gelesen markiert" };
  },
);
