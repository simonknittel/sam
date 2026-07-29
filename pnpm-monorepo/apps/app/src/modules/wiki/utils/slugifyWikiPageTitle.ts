import slug from "slug";

/**
 * Derives the cosmetic URL slug from a page title. Only the page id is used
 * to resolve a page, so collisions are fine.
 */
export const slugifyWikiPageTitle = (title: string) => {
  const result = slug(title, { locale: "de" }).slice(0, 64);
  return result || "-";
};
