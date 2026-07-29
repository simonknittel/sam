import { mergeAttributes, Node } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiCitizenMention: {
      /** Inserts a citizen mention at the current position */
      setWikiCitizenMention: (attributes: {
        citizenId: string;
        handle: string | null;
      }) => ReturnType;
    };
  }
}

export interface WikiMentionedCitizen {
  handle: string | null;
}

export interface WikiCitizenMentionOptions {
  /**
   * Current handles of the citizens mentioned on the page, by id. Labels
   * prefer this map so mentions follow handle changes; the handle stored
   * in the document is the fallback for citizens not (yet) in the map,
   * e.g. mentions inserted since the page was loaded.
   */
  citizens: Readonly<Record<string, WikiMentionedCitizen>>;
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
  const label = citizens[citizenId]?.handle ?? storedHandle;

  if (!citizenId || label === null) return null;
  return { citizenId, label };
};

/**
 * An inline mention of a citizen (spynet entity), rendered as a link to the
 * citizen's spynet page. Stores the citizen id plus the handle at insertion
 * time — the id is the reference, the handle only a denormalized label
 * fallback (and the searchable text).
 */
export const WikiCitizenMention = Node.create<WikiCitizenMentionOptions>({
  name: "wikiCitizenMention",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      citizens: {},
    };
  },

  addAttributes() {
    return {
      citizenId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-wiki-citizen-mention"),
        renderHTML: (attributes) =>
          attributes.citizenId === null
            ? {}
            : { "data-wiki-citizen-mention": String(attributes.citizenId) },
      },
      handle: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-wiki-citizen-mention-handle"),
        renderHTML: (attributes) =>
          typeof attributes.handle === "string" && attributes.handle
            ? { "data-wiki-citizen-mention-handle": attributes.handle }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      { tag: "a[data-wiki-citizen-mention]" },
      { tag: "span[data-wiki-citizen-mention]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const resolved = resolveWikiCitizenMention(
      this.options.citizens,
      node.attrs,
    );

    if (!resolved)
      return [
        "span",
        mergeAttributes({ "data-unavailable": "" }, HTMLAttributes),
        "@Unbekannt",
      ];

    return [
      "a",
      mergeAttributes(
        {
          href: `/app/spynet/citizen/${encodeURIComponent(resolved.citizenId)}`,
        },
        HTMLAttributes,
      ),
      `@${resolved.label}`,
    ];
  },

  addCommands() {
    return {
      setWikiCitizenMention:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },
});

/**
 * Collects the ids of all citizens mentioned in a Tiptap JSON document, so
 * their current handles can be resolved before rendering.
 */
export const collectWikiMentionedCitizenIds = (content: unknown): string[] => {
  const ids = new Set<string>();

  walkWikiContent(content, (node) => {
    if (
      node.type === "wikiCitizenMention" &&
      typeof node.attrs?.citizenId === "string" &&
      node.attrs.citizenId
    )
      ids.add(node.attrs.citizenId);
  });

  return [...ids];
};
