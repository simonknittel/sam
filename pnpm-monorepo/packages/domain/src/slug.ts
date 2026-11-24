import slug from "slug";

/** Wiki pages and career flows share it */
export const SLUG_MAX_LENGTH = 64;

/**
 * Matches exactly what `slugify()` produces, so a hand-edited slug can be
 * validated against the same rules.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Input without a single mappable character gives a base64-derived slug (the
 * fallback of the slug package). Returns an empty string only for empty input —
 * callers decide whether that is a fallback case or something to reject.
 */
export const slugify = (value: string) =>
  slug(value, { locale: "de" })
    .slice(0, SLUG_MAX_LENGTH)
    // The cap can cut mid-word and leave a dangling dash behind
    .replace(/-+$/, "");

/**
 * Only the page id is used to resolve a page, so collisions are fine — but the
 * slug is part of the path and therefore must never be empty.
 */
export const slugifyWikiPageTitle = (title: string) => slugify(title) || "-";
