export interface WikiMentionedCitizen {
  handle: string | null;
}

export interface ResolvedWikiCitizenMention {
  citizenId: string;
  label: string;
}

/**
 * Resolves a mention's target and label from its attributes and the
 * citizens map — the current handle wins, the handle stored in the document
 * is the fallback. Null when neither is available.
 */
export const resolveWikiCitizenMention = (
  citizens: Readonly<Record<string, WikiMentionedCitizen>>,
  attributes: Readonly<Record<string, unknown>>,
): ResolvedWikiCitizenMention | null => {
  const citizenId =
    typeof attributes.citizenId === "string" ? attributes.citizenId : "";
  const storedHandle =
    typeof attributes.handle === "string" && attributes.handle
      ? attributes.handle
      : null;
  // The id is document content — keys like "constructor" must not resolve
  const citizen = Object.hasOwn(citizens, citizenId)
    ? citizens[citizenId]
    : undefined;
  const label = citizen?.handle ?? storedHandle;

  if (!citizenId || label === null) return null;
  return { citizenId, label };
};
