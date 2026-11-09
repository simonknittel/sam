import { VariantStatus } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { ExternalService } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "../wiki/getAccessibleWikiPage.js";
import { buildWikiContext } from "../wiki/wikiContext.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";
import { VARIANT_TAG_SELECT } from "./shipVariant.js";

/**
 * The tags or the links of one variant. A variant has few tags, and one link
 * for each external service.
 */
const MAXIMUM_VARIANT_ROWS = 50;

/**
 * A practical cap of the browsers for the length of a URL. A link of a
 * variant to an external service is much shorter.
 */
const MAXIMUM_VARIANT_LINK_URL_LENGTH = 2048;

/**
 * Arbitrary cap of the key and of the value of a tag, the same as the cap of
 * the catalog names. The badges show short texts.
 */
const MAXIMUM_VARIANT_TAG_TEXT_LENGTH = 255;

const tagTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_VARIANT_TAG_TEXT_LENGTH);

/**
 * The fields of the variant that the create and the update share. An absent
 * field stays at an update.
 */
export const variantFieldsInputShape = {
  status: z
    .enum([VariantStatus.FLIGHT_READY, VariantStatus.NOT_FLIGHT_READY])
    .optional(),
  tags: z
    .array(z.object({ key: tagTextSchema, value: tagTextSchema }))
    .max(MAXIMUM_VARIANT_ROWS)
    .optional()
    .describe(
      "All tags of the variant, each a key and a value. At an update, they replace all tags of the variant, and an empty array removes them.",
    ),
  links: z
    .array(
      z.object({
        service: z.enum(ExternalService),
        url: z.httpUrl().max(MAXIMUM_VARIANT_LINK_URL_LENGTH),
      }),
    )
    .max(MAXIMUM_VARIANT_ROWS)
    .optional()
    .describe(
      "All links of the variant to external websites, at most one for each service. At an update, they replace all links of the variant, and an empty array removes them.",
    ),
  wiki_page_id: z
    .union([idSchema, z.literal("")])
    .optional()
    .describe(
      "The page of the global wiki (from list_wiki_pages or search_wiki) that the variant page embeds. At an update, an empty text removes the link.",
    ),
};

type VariantFieldsInput = z.infer<z.ZodObject<typeof variantFieldsInputShape>>;

type VariantTagInput = NonNullable<VariantFieldsInput["tags"]>[number];

type VariantLinkInput = NonNullable<VariantFieldsInput["links"]>[number];

/** An external link of a variant, also in the audit events */
export interface VariantLink {
  readonly serviceName: string;
  readonly url: string;
}

const isSameTag = (first: VariantTagInput, second: VariantTagInput) =>
  first.key === second.key && first.value === second.value;

/**
 * The ids of the tags, for the tags of the variant. Creates the tags that do
 * not exist yet. The same tag two times in the input is one tag.
 */
export const findOrCreateVariantTagIds = async (
  transaction: Prisma.TransactionClient,
  tags: readonly VariantTagInput[],
  authorCitizenId: string,
): Promise<string[]> => {
  if (tags.length === 0) return [];

  const existingTags = await transaction.variantTag.findMany({
    where: { OR: tags.map(({ key, value }) => ({ key, value })) },
    select: VARIANT_TAG_SELECT,
  });

  const missingTags = tags.filter(
    (tag, index) =>
      !existingTags.some((existingTag) => isSameTag(existingTag, tag)) &&
      tags.findIndex((otherTag) => isSameTag(otherTag, tag)) === index,
  );

  const createdTags = await transaction.variantTag.createManyAndReturn({
    data: missingTags.map(({ key, value }) => ({
      key,
      value,
      createdById: authorCitizenId,
    })),
    select: { id: true },
  });

  return [
    ...existingTags.map((tag) => tag.id),
    ...createdTags.map((tag) => tag.id),
  ];
};

/**
 * The links of the input in the format of the audit events
 *
 * @throws ValidationError when two links have the same service
 */
export const toVariantLinks = (
  links: readonly VariantLinkInput[],
): VariantLink[] => {
  if (new Set(links.map((link) => link.service)).size < links.length)
    throw new ValidationError(FleetCatalogErrorMessage.DuplicateLinkService);

  return links.map((link) => ({ serviceName: link.service, url: link.url }));
};

/**
 * Makes the external links of the variant the given links: one link for each
 * service. Keeps the row of a service that stays, thus its creator stays.
 */
export const syncVariantExternalLinks = async (
  transaction: Prisma.TransactionClient,
  variantId: string,
  links: readonly VariantLink[],
  authorCitizenId: string,
) => {
  if (links.length === 0) {
    await transaction.variantExternalLink.deleteMany({ where: { variantId } });
    return;
  }

  const existingLinks = await transaction.variantExternalLink.findMany({
    where: { variantId },
    select: { id: true, serviceName: true },
  });

  const serviceNames = new Set(links.map((link) => link.serviceName));
  const removedLinks = existingLinks.filter(
    (existingLink) => !serviceNames.has(existingLink.serviceName),
  );
  if (removedLinks.length > 0)
    await transaction.variantExternalLink.deleteMany({
      where: { id: { in: removedLinks.map((link) => link.id) } },
    });

  // An interactive transaction runs one statement at a time
  for (const link of links) {
    const existingLink = existingLinks.find(
      (candidate) => candidate.serviceName === link.serviceName,
    );

    if (existingLink)
      await transaction.variantExternalLink.update({
        where: { id: existingLink.id },
        data: { url: link.url, updatedById: authorCitizenId },
      });
    else
      await transaction.variantExternalLink.create({
        data: {
          variantId,
          serviceName: link.serviceName,
          url: link.url,
          createdById: authorCitizenId,
          updatedById: authorCitizenId,
        },
      });
  }
};

/**
 * The linked page of a variant must be a page of the global wiki that the
 * actor can read.
 *
 * @throws ValidationError for an unknown page, a page in the trash and a page
 * that the actor cannot read alike, thus the existence of a page never leaks
 */
export const requireReadableGlobalWikiPage = async (
  context: ApplicationContext,
  actor: Actor,
  pageId: string,
) => {
  const wikiContext = await buildWikiContext(context, actor);

  if (!getAccessibleWikiPage(wikiContext, pageId, WikiPageAccessTier.Read))
    throw new ValidationError(FleetCatalogErrorMessage.WikiPageNotReadable);
};
