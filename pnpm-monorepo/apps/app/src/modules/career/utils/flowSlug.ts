import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/modules/common/utils/slugify";

/**
 * Static segments under `/app/career`. The router matches them before
 * `[flowSlug]`, so a flow taking one would be unreachable.
 */
export const RESERVED_FLOW_SLUGS: readonly string[] = ["settings"];

export const FLOW_NAME_MAX_LENGTH = 128;

export const FLOW_SLUG_FORMAT_ERROR = `Der Slug darf nur Kleinbuchstaben, Ziffern und einzelne Bindestriche enthalten und höchstens ${SLUG_MAX_LENGTH} Zeichen lang sein.`;

export const FLOW_SLUG_RESERVED_ERROR =
  "Dieser Slug ist reserviert und kann nicht verwendet werden.";

export const FLOW_SLUG_TAKEN_ERROR =
  "Dieser Slug wird bereits von einem anderen Karrierebaum verwendet.";

/**
 * Validates a hand-edited slug against the derivation rules and the reserved
 * segments. Uniqueness is not checked here — it needs the database and is
 * enforced by the actions and, as a last line of defence, by the partial
 * unique index on non-deleted rows.
 */
export const validateFlowSlug = (slug: string) => {
  if (slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug))
    return FLOW_SLUG_FORMAT_ERROR;
  if (RESERVED_FLOW_SLUGS.includes(slug)) return FLOW_SLUG_RESERVED_ERROR;
  return null;
};
