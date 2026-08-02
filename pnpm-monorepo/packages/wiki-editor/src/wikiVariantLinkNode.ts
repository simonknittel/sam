import { mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiVariantLink: {
      /** Inserts a link to a fleet variant at the current position */
      setWikiVariantLink: (attributes: {
        variantId: string;
        name: string | null;
      }) => ReturnType;
    };
  }
}

export interface WikiVariantLogo {
  /**
   * Absolute URL of the manufacturer's logo. Resolved by the app so this
   * package needs no knowledge of the upload storage.
   */
  src: string;
  /** Consumers skip image optimization for SVG/GIF */
  mimeType: string;
}

export interface WikiLinkedVariant {
  name: string;
  manufacturerName: string;
  logo?: WikiVariantLogo;
}

export interface WikiVariantLinkOptions {
  /**
   * Current names of the variants linked on the page, by id. Labels prefer
   * this map so links follow renames; the name stored in the document is
   * the fallback for variants not (yet) in the map, e.g. links inserted
   * since the page was loaded.
   */
  variants: Readonly<Record<string, WikiLinkedVariant>>;
}

export interface ResolvedWikiVariantLink {
  variantId: string;
  name: string;
  manufacturerName: string | null;
  logo: WikiVariantLogo | null;
}

/**
 * Matches pasted variant URLs (any host, /app/fleet/variant/<id>) so they
 * become variant links instead of plain text.
 */
const PASTE_PATTERN =
  /https?:\/\/\S+\/app\/fleet\/variant\/([a-z0-9]{10,40})(?:\/\S*)?/g;

/**
 * Resolves a variant link's label from its attributes and the variants
 * map — the current name wins, the name stored in the document is the
 * fallback (a link pasted as a URL has neither until the map catches up).
 * Null when neither is available.
 */
export const resolveWikiVariantLink = (
  variants: Readonly<Record<string, WikiLinkedVariant>>,
  attributes: Readonly<Record<string, unknown>>,
): ResolvedWikiVariantLink | null => {
  const variantId =
    typeof attributes.variantId === "string" ? attributes.variantId : "";
  const storedName =
    typeof attributes.name === "string" && attributes.name
      ? attributes.name
      : null;
  const variant = variants[variantId];
  const name = variant?.name ?? storedName;

  if (!variantId || name === null) return null;
  return {
    variantId,
    name,
    manufacturerName: variant?.manufacturerName ?? null,
    logo: variant?.logo ?? null,
  };
};

/** Where a variant link points — shared with the app's rendering */
export const wikiVariantLinkHref = (variantId: string) =>
  `/app/fleet/variant/${encodeURIComponent(variantId)}`;

/**
 * An inline link to a ship variant of the fleet app, rendered as the
 * variant's name next to its manufacturer's logo. Stores the variant id
 * plus its name at insertion time — the id is the reference (so links
 * follow renames), the name only a denormalized label fallback (and the
 * searchable text).
 */
export const WikiVariantLink = Node.create<WikiVariantLinkOptions>({
  name: "wikiVariantLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      variants: {},
    };
  },

  addAttributes() {
    return {
      variantId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-wiki-variant-link"),
        renderHTML: (attributes) =>
          attributes.variantId === null
            ? {}
            : { "data-wiki-variant-link": String(attributes.variantId) },
      },
      name: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-wiki-variant-link-name"),
        renderHTML: (attributes) =>
          typeof attributes.name === "string" && attributes.name
            ? { "data-wiki-variant-link-name": attributes.name }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      { tag: "a[data-wiki-variant-link]" },
      { tag: "span[data-wiki-variant-link]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const resolved = resolveWikiVariantLink(this.options.variants, node.attrs);

    if (!resolved)
      return [
        "span",
        mergeAttributes({ "data-unavailable": "" }, HTMLAttributes),
        "Nicht verfügbares Schiff",
      ];

    const children: (string | [string, Record<string, string>])[] =
      resolved.logo
        ? [
            [
              "img",
              {
                src: resolved.logo.src,
                alt: "",
                ...(resolved.manufacturerName
                  ? { title: `Logo of ${resolved.manufacturerName}` }
                  : {}),
              },
            ],
            resolved.name,
          ]
        : [resolved.name];

    return [
      "a",
      mergeAttributes(
        { href: wikiVariantLinkHref(resolved.variantId) },
        HTMLAttributes,
      ),
      ...children,
    ];
  },

  addCommands() {
    return {
      setWikiVariantLink:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: PASTE_PATTERN,
        type: this.type,
        /** The name is unknown at paste time — resolved from the map */
        getAttributes: (match) =>
          typeof match[1] === "string"
            ? { variantId: match[1], name: null }
            : null,
      }),
    ];
  },
});

/**
 * Collects the ids of all variants linked in a Tiptap JSON document, so
 * their current names and logos can be resolved before rendering.
 */
export const collectWikiVariantLinkIds = (content: unknown): string[] => {
  const ids = new Set<string>();

  walkWikiContent(content, (node) => {
    if (
      node.type === "wikiVariantLink" &&
      typeof node.attrs?.variantId === "string" &&
      node.attrs.variantId
    )
      ids.add(node.attrs.variantId);
  });

  return [...ids];
};
