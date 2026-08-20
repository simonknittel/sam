"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import { AppKeyNamespace, findAppByKey } from "../utils/getAppKey";
import { getAppLinks } from "../utils/queries/getAppLinks";

/** Long enough for any slug we could reasonably give an app */
const MAXIMUM_APP_KEY_LENGTH = 128;

const schema = z.object({
  appKey: z
    .string()
    .max(MAXIMUM_APP_KEY_LENGTH)
    .regex(
      new RegExp(
        `^(${AppKeyNamespace.Integrated}|${AppKeyNamespace.External}):[a-zA-Z0-9-]+$`,
      ),
    ),
});

export const toggleAppFavorite = createAuthenticatedAction(
  "toggleAppFavorite",
  schema,
  async (formData, authentication, data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Resolving the key against the apps the caller can actually see keeps
     * unknown and redacted apps from creating rows — redacted apps carry no
     * key, so they never match.
     */
    const apps = await getAppLinks();
    if (!findAppByKey(apps, data.appKey))
      return { error: t("Common.notFound"), requestPayload: formData };

    const existingFavorite = await prisma.citizenAppFavorite.findUnique({
      where: { citizenId_appKey: { citizenId, appKey: data.appKey } },
    });

    if (existingFavorite) {
      await prisma.citizenAppFavorite.delete({
        where: { id: existingFavorite.id },
      });
    } else {
      await prisma.citizenAppFavorite.create({
        data: { citizenId, appKey: data.appKey },
      });
    }

    await createAuditEvents([
      {
        type: existingFavorite
          ? AuditEventType.APP_FAVORITE_REMOVED
          : AuditEventType.APP_FAVORITE_ADDED,
        data: {
          appKey: data.appKey,
          citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Deliberately no revalidation: apps are resolved in the `/app` layout, so
     * revalidating would re-render the whole shell underneath the open
     * popover. The apps context holds the optimistic state instead.
     */
    return {
      success: existingFavorite
        ? "Favorit entfernt."
        : "Als Favorit gespeichert.",
    };
  },
);
