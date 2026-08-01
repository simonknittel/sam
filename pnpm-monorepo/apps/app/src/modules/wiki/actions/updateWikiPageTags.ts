"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";

const tagNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s+/g, " "))
  .pipe(z.string().min(1).max(50));

const schema = z.object({
  id: z.cuid2(),
  tagNames: z.array(tagNameSchema).max(20),
});

/**
 * Replaces the tags of a page with the submitted set. Tag names are matched
 * against existing tags case-insensitively (find-or-create) so duplicates
 * differing only in casing can never come into existence. A tag whose last
 * assignment is removed here is deleted right away to keep the autocomplete
 * clean.
 */
export const updateWikiPageTags = createAuthenticatedAction(
  "updateWikiPageTags",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canEdit)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * First submitted casing wins for names that only differ in casing.
     */
    const requestedNamesByLower = new Map<string, string>();
    for (const name of data.tagNames) {
      const lower = name.toLocaleLowerCase();
      if (!requestedNamesByLower.has(lower))
        requestedNamesByLower.set(lower, name);
    }

    const currentAssignments = await prisma.wikiPageTag.findMany({
      where: { pageId: page.id },
      select: { id: true, tagId: true, tag: { select: { name: true } } },
    });
    const currentByLower = new Map(
      currentAssignments.map((assignment) => [
        assignment.tag.name.toLocaleLowerCase(),
        assignment,
      ]),
    );

    const removedAssignments = currentAssignments.filter(
      (assignment) =>
        !requestedNamesByLower.has(assignment.tag.name.toLocaleLowerCase()),
    );
    const addedNames = [...requestedNamesByLower.entries()]
      .filter(([lower]) => !currentByLower.has(lower))
      .map(([, name]) => name);

    if (removedAssignments.length === 0 && addedNames.length === 0)
      return { success: t("Common.successfullySaved") };

    const citizenId = authentication.session.entity?.id ?? null;

    /**
     * Case-insensitive find-or-create per added name. The display casing of
     * an existing tag wins over the submitted one.
     */
    const addedTags = [];
    for (const name of addedNames) {
      const existing = await prisma.wikiTag.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      addedTags.push(
        existing ??
          (await prisma.wikiTag.create({
            data: { name, createdById: citizenId },
            select: { id: true, name: true },
          })),
      );
    }

    const removedTagIds = removedAssignments.map(
      (assignment) => assignment.tagId,
    );

    await prisma.$transaction([
      prisma.wikiPageTag.deleteMany({
        where: { id: { in: removedAssignments.map((entry) => entry.id) } },
      }),
      prisma.wikiPageTag.createMany({
        data: addedTags.map((tag) => ({
          pageId: page.id,
          tagId: tag.id,
          createdById: citizenId,
        })),
        skipDuplicates: true,
      }),
      /**
       * Runs after the assignment delete above, so tags whose last usage was
       * just removed are swept immediately.
       */
      prisma.wikiTag.deleteMany({
        where: { id: { in: removedTagIds }, pages: { none: {} } },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_TAGS_UPDATED,
        data: {
          pageId: page.id,
          addedTagNames: addedTags.map((tag) => tag.name),
          removedTagNames: removedAssignments.map(
            (assignment) => assignment.tag.name,
          ),
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      tagNames: formData.getAll("tagName[]"),
    }),
  },
);
