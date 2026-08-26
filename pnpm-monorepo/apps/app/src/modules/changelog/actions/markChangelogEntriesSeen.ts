"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import { getChangelogTrackedKeys } from "../queries/getChangelogTrackedKeys";

const schema = z.object({
  keys: z.array(z.string().max(100)).min(1).max(100),
});

/**
 * Marks a batch of tracked changelog entries as seen by the citizen. Called
 * by the read-on-view tracking of the changelog page, hence the batch input.
 */
export const markChangelogEntriesSeen = createAuthenticatedAction(
  "markChangelogEntriesSeen",
  schema,
  async (formData, authentication, data, t) => {
    const entity = authentication.session.entity;
    if (!entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const trackedKeys = new Set(await getChangelogTrackedKeys());
    const keysToMark = data.keys.filter((key) => trackedKeys.has(key));
    if (keysToMark.length <= 0) return { success: "Als gelesen markiert" };

    const { count } = await prisma.changelogEntrySeen.createMany({
      data: keysToMark.map((key) => ({
        citizenId: entity.id,
        key,
      })),
      skipDuplicates: true,
    });

    /** Read-on-view re-submits seen keys; only real changes are logged */
    if (count > 0)
      await createAuditEvents([
        {
          type: AuditEventType.CHANGELOG_ENTRIES_SEEN,
          data: {
            citizenId: entity.id,
            count,
          },
          createdById: authentication.session.user.id,
        },
      ]);

    return { success: "Als gelesen markiert" };
  },
  {
    parseFormData: (formData) => ({
      keys: formData.getAll("key"),
    }),
  },
);
