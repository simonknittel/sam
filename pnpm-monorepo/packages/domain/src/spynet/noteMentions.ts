/**
 * The content of a note can mention citizens and organizations by their
 * Spectrum ID, for example "@citizen:12345" or "@org:SINISTER". The page
 * shows a mention as a link to the citizen or the organization.
 */

export const CITIZEN_MENTION_PATTERN = /@citizen:(\d+)/;

export const ORGANIZATION_MENTION_PATTERN = /@org:([a-zA-Z0-9_]+)/;

/**
 * All mentions in a content. Each group is a full mention, thus
 * `content.split(NOTE_MENTION_PATTERN)` gives the text and each mention as
 * separate parts, with `undefined` for the group that did not match.
 */
export const NOTE_MENTION_PATTERN = /(@citizen:\d+)|(@org:[a-zA-Z0-9_]+)/g;

interface NoteMentionSpectrumIds {
  readonly citizenSpectrumIds: string[];
  readonly organizationSpectrumIds: string[];
}

export const getNoteMentionSpectrumIds = (
  content: string,
): NoteMentionSpectrumIds => {
  const citizenSpectrumIds = new Set<string>();
  const organizationSpectrumIds = new Set<string>();

  for (const mention of content.match(NOTE_MENTION_PATTERN) ?? []) {
    const citizenSpectrumId = CITIZEN_MENTION_PATTERN.exec(mention)?.[1];
    if (citizenSpectrumId) {
      citizenSpectrumIds.add(citizenSpectrumId);
      continue;
    }

    const organizationSpectrumId =
      ORGANIZATION_MENTION_PATTERN.exec(mention)?.[1];
    if (organizationSpectrumId)
      organizationSpectrumIds.add(organizationSpectrumId);
  }

  return {
    citizenSpectrumIds: Array.from(citizenSpectrumIds),
    organizationSpectrumIds: Array.from(organizationSpectrumIds),
  };
};
