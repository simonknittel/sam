import { getCitizenDisplayName } from "@sam-monorepo/domain";
import {
  collectWikiMentionedCitizenIds,
  collectWikiVariantLinkIds,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
} from "@sam-monorepo/wiki-editor";
import { getPublicUploadUrl, type ApplicationContext } from "../context.js";
import { VARIANT_LINK_SELECT } from "../fleet/catalogRows.js";

/**
 * Current handles of the citizens mentioned in the content, so mentions
 * follow handle changes. Mentions inserted after this render fall back to
 * the handle stored in the document. Viewers without the citizen read
 * permission get these insertion-time handles instead of live ones. A
 * deleted citizen shows the deleted label for each viewer, also instead of
 * the stored handle.
 *
 * @param canReadCitizens Whether the reader has `citizen;read`
 */
export const loadWikiMentionedCitizens = async (
  prisma: ApplicationContext["prisma"],
  canReadCitizens: boolean,
  content: unknown,
): Promise<Record<string, WikiMentionedCitizen>> => {
  const mentionedCitizenIds = collectWikiMentionedCitizenIds(content);
  if (mentionedCitizenIds.length === 0) return {};

  const citizens = await prisma.citizen.findMany({
    where: { id: { in: mentionedCitizenIds } },
    select: { id: true, deletedAt: true, handle: canReadCitizens },
  });

  return Object.fromEntries(
    citizens.map((citizen) => [
      citizen.id,
      {
        handle:
          citizen.deletedAt || canReadCitizens
            ? getCitizenDisplayName(citizen)
            : null,
        deleted: citizen.deletedAt !== null,
      },
    ]),
  );
};

/**
 * The current names and manufacturer logos of the variants that the content
 * links to, thus the links follow a rename. There is no permission filter:
 * the wiki shows each reader which ship the content means. Only the page of
 * the variant has a gate.
 */
export const loadWikiLinkedVariants = async (
  context: Pick<ApplicationContext, "prisma" | "urls">,
  content: unknown,
): Promise<Record<string, WikiLinkedVariant>> => {
  const linkedVariantIds = collectWikiVariantLinkIds(content);
  if (linkedVariantIds.length === 0) return {};

  const variants = await context.prisma.variant.findMany({
    where: { id: { in: linkedVariantIds } },
    select: VARIANT_LINK_SELECT,
  });

  return Object.fromEntries(
    variants.map((variant) => {
      const { manufacturer } = variant.series;

      return [
        variant.id,
        {
          name: variant.name,
          manufacturerName: manufacturer.name,
          logo: manufacturer.image
            ? {
                src: getPublicUploadUrl(context.urls, manufacturer.image.id),
                mimeType: manufacturer.image.mimeType,
              }
            : undefined,
        },
      ];
    }),
  );
};
