import { slugify } from "@/modules/common/utils/slugify";

/**
 * Derives the cosmetic URL slug from a page title. Only the page id is used
 * to resolve a page, so collisions are fine — but the slug is part of the
 * path and therefore must never be empty.
 */
export const slugifyWikiPageTitle = (title: string) => slugify(title) || "-";
