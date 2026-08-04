"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";

const schema = z.object({
  title: z.string().trim().min(1).max(128),
  /** Empty string or absent creates a top-level page */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const createWikiPage = createAuthenticatedAction(
  "createWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    if (!context || !authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };

    if (data.parentId) {
      const placement = resolveWikiPagePlacement(context, data.parentId);
      if (placement !== WikiPagePlacement.Allowed)
        return {
          error:
            placement === WikiPagePlacement.Missing
              ? t("Common.notFound")
              : t("Common.forbidden"),
          requestPayload: formData,
        };
    } else {
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const siblings = context.pages.filter(
      (page) => page.parentId === (data.parentId ?? null),
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((page) => page.sortOrder)) + 1
        : 0;

    /**
     * Defaults: top-level pages are "private" (RESTRICTED without roles) and
     * owned by their creator; child pages inherit everything including the
     * owner.
     */
    const page = await prisma.wikiPage.create({
      data: {
        title: data.title,
        slug: slugifyWikiPageTitle(data.title),
        parentId: data.parentId ?? null,
        sortOrder,
        visibility: data.parentId
          ? WikiPageVisibility.INHERIT
          : WikiPageVisibility.RESTRICTED,
        editability: data.parentId
          ? WikiPageEditability.INHERIT
          : WikiPageEditability.RESTRICTED,
        imageUploadability: data.parentId
          ? WikiPageUploadability.INHERIT
          : WikiPageUploadability.RESTRICTED,
        attachmentUploadability: data.parentId
          ? WikiPageUploadability.INHERIT
          : WikiPageUploadability.RESTRICTED,
        ownerId: data.parentId ? null : authentication.session.entity.id,
        createdById: authentication.session.entity.id,
      },
      select: { id: true, slug: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_CREATED,
        data: {
          pageId: page.id,
          title: data.title,
          parentId: data.parentId ?? null,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");
    redirect(`/app/wiki/${page.id}/${page.slug}`);
  },
);
