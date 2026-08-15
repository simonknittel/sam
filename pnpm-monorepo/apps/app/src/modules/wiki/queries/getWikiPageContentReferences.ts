import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import {
  collectWikiMentionedCitizenIds,
  collectWikiRoleCitizensRoleIds,
  collectWikiVariantLinkIds,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
} from "@sam-monorepo/wiki-editor";
import type { WikiRoleCitizen } from "../components/WikiRoleCitizensList";
import { resolveWikiRoleCitizens } from "../utils/resolveWikiRoleCitizens";

/**
 * Resolvers for the references a page's content can carry (mentions, ship
 * links, role-member nodes). Independent of the wiki scope — shared by the
 * global and the event wiki's static content queries.
 */

/**
 * Current handles of the citizens mentioned in the content, so mentions
 * follow handle changes. Mentions inserted after this render fall back to
 * the handle stored in the document. Viewers without the citizen read
 * permission get these insertion-time handles instead of live ones.
 */
export const getWikiMentionedCitizens = async (
  content: unknown,
): Promise<Record<string, WikiMentionedCitizen>> => {
  const authentication = await authenticate();
  const canReadCitizens = Boolean(
    authentication && (await authentication.authorize("citizen", "read")),
  );

  const mentionedCitizenIds = collectWikiMentionedCitizenIds(content);
  return Object.fromEntries(
    (canReadCitizens && mentionedCitizenIds.length > 0
      ? await prisma.entity.findMany({
          where: { id: { in: mentionedCitizenIds } },
          select: { id: true, handle: true },
        })
      : []
    ).map((citizen) => [citizen.id, { handle: citizen.handle }]),
  );
};

/**
 * Current names and manufacturer logos of the variants linked in the
 * content, so links follow renames. Links inserted after this render
 * resolve themselves client-side (see WikiVariantLinkNodeView).
 * Deliberately not permission-filtered: the wiki shows every reader which
 * ship is meant — only the variant page itself stays gated.
 */
export const getWikiLinkedVariants = async (
  content: unknown,
): Promise<Record<string, WikiLinkedVariant>> => {
  const linkedVariantIds = collectWikiVariantLinkIds(content);
  return Object.fromEntries(
    (linkedVariantIds.length > 0
      ? await prisma.variant.findMany({
          where: { id: { in: linkedVariantIds } },
          select: {
            id: true,
            name: true,
            series: {
              select: {
                manufacturer: {
                  select: {
                    name: true,
                    image: { select: { id: true, mimeType: true } },
                  },
                },
              },
            },
          },
        })
      : []
    ).map((variant) => [
      variant.id,
      {
        name: variant.name,
        manufacturerName: variant.series.manufacturer.name,
        logo: variant.series.manufacturer.image
          ? {
              src: getPublicUploadUrl(variant.series.manufacturer.image.id),
              mimeType: variant.series.manufacturer.image.mimeType,
            }
          : undefined,
      },
    ]),
  );
};

/**
 * Members of the role-member nodes on this page, resolved for this viewer —
 * for the static render and as the editor node views' initial data; the
 * node views refetch so role changes show up without a reload.
 */
export const getWikiRoleCitizensByRole = async (
  content: unknown,
): Promise<Record<string, WikiRoleCitizen[]>> =>
  Object.fromEntries(
    await Promise.all(
      collectWikiRoleCitizensRoleIds(content).map(
        async (roleId) =>
          [roleId, await resolveWikiRoleCitizens(roleId)] as const,
      ),
    ),
  );
