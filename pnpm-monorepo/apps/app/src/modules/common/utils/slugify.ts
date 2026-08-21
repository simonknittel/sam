import slug from "slug";

/** Longest slug the app produces. Wiki pages and career flows share it. */
export const SLUG_MAX_LENGTH = 64;

/**
 * Matches exactly what `slugify()` produces, so a hand-edited slug can be
 * validated against the same rules: lowercase alphanumerics in groups joined
 * by single dashes.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The app's shared slug rules: German transliteration, lowercase, words
 * joined by single dashes, capped at `SLUG_MAX_LENGTH`. Returns an empty
 * string for input without a single mappable character — callers decide
 * whether that is a fallback case or something to reject.
 */
export const slugify = (value: string) =>
  slug(value, { locale: "de" })
    .slice(0, SLUG_MAX_LENGTH)
    /** The cap can cut mid-word and leave a dangling dash behind */
    .replace(/-+$/, "");
