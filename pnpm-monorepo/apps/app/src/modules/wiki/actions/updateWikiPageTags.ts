"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  revalidateWikiScope,
} from "../queries/getWikiPageScopedContext";

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
    const scoped = await getWikiPageScopedContext(data.id);
    if (!scoped)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    /**
     * The freeze would already deny through canEdit (the resolver strips it
     * on frozen events); the explicit check only yields the events' usual
     * error message instead of a generic forbidden.
     */
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
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
     * Case-insensitive find-or-create per added name, scoped to the page's
     * event (or the global wiki). The display casing of an existing tag wins
     * over the submitted one.
     */
    const addedTags = [];
    for (const name of addedNames) {
      const existing = await prisma.wikiTag.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          eventId: page.eventId,
        },
        select: { id: true, name: true },
      });
      addedTags.push(
        existing ??
          (await prisma.wikiTag.create({
            data: { name, eventId: page.eventId, createdById: citizenId },
            select: { id: true, name: true },
          })),
      );
    }

    const removedTagIds = removedAssignments.map(
      (assignment) => assignment.tagId,
    );

    const keptNames = currentAssignments
      .filter((assignment) => !removedAssignments.includes(assignment))
      .map((assignment) => assignment.tag.name);
    const tagsText = [...keptNames, ...addedTags.map((tag) => tag.name)]
      .sort((a, b) => a.localeCompare(b))
      .join(" ");

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
      /**
       * Denormalized copy of the tag names for the full-text search (see
       * WikiPage.tagsText).
       */
      prisma.wikiPage.update({
        where: { id: page.id },
        data: { tagsText, updatedById: citizenId },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_TAGS_UPDATED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          addedTagNames: addedTags.map((tag) => tag.name),
          removedTagNames: removedAssignments.map(
            (assignment) => assignment.tag.name,
          ),
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidateWikiScope(scoped);

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      tagNames: formData.getAll("tagName[]"),
    }),
  },
);
