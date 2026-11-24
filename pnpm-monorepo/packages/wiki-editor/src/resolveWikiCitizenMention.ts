export interface WikiMentionedCitizen {
  handle: string | null;
  /** A deleted citizen keeps its mentions, without a link to its page */
  deleted?: boolean;
}

export interface ResolvedWikiCitizenMention {
  citizenId: string;
  label: string;
  deleted: boolean;
}

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
  return { citizenId, label, deleted: citizen?.deleted ?? false };
};
