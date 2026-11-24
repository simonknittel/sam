import { mergeAttributes, Node } from "@tiptap/core";
import {
  resolveWikiCitizenMention,
  type WikiMentionedCitizen,
} from "./resolveWikiCitizenMention.js";
import { walkWikiContent } from "./walkWikiContent.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiCitizenMention: {
      setWikiCitizenMention: (attributes: {
        citizenId: string;
        handle: string | null;
      }) => ReturnType;
    };
  }
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

/**
 * A deleted citizen gets no link. The id is the reference, the handle at
 * insertion time is only a denormalized label fallback (and the searchable
 * text).
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

    if (resolved.deleted)
      return [
        "span",
        mergeAttributes({ "data-deleted": "" }, HTMLAttributes),
        `@${resolved.label}`,
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
