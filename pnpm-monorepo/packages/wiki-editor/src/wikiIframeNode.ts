import { mergeAttributes, Node } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";
import { renderWikiBlockedPlaceholder } from "./wikiBlockedPlaceholder.js";
import {
  wikiAlignAttribute,
  wikiWidthPercentAttribute,
} from "./wikiResizableNodes.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiIframe: {
      /** Inserts a generic, allowlist-validated iframe */
      setWikiIframe: (attributes: { src: string }) => ReturnType;
    };
  }
}

export interface WikiIframeOptions {
  /**
   * Hostnames generic iframes may embed (from the wiki settings). An entry
   * matches its exact hostname and all subdomains. Rendering re-validates
   * on every render, so removing an entry blocks existing embeds too.
   */
  allowlist: readonly string[];
}

/**
 * Checks a generic iframe src against the allowlist: https-only, hostname
 * must equal an entry or be a subdomain of one.
 */
export const isWikiIframeSrcAllowed = (
  src: unknown,
  allowlist: readonly string[],
): boolean => {
  if (typeof src !== "string") return false;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  return allowlist.some((entry) => {
    const hostname = entry.trim().toLowerCase();
    if (!hostname) return false;
    return url.hostname === hostname || url.hostname.endsWith(`.${hostname}`);
  });
};

/**
 * All generic-iframe src values of a Tiptap JSON document, e.g. for
 * re-validating imported content against the allowlist (imports bypass the
 * insertion-time check).
 */
export const collectWikiIframeSrcs = (content: unknown): string[] => {
  const srcs = new Set<string>();

  walkWikiContent(content, (node) => {
    if (node.type === "wikiIframe" && typeof node.attrs?.src === "string")
      srcs.add(node.attrs.src);
  });

  return [...srcs];
};

/**
 * A generic iframe whose src host is validated against the domain allowlist
 * stored in the wiki settings.
 */
export const WikiIframe = Node.create<WikiIframeOptions>({
  name: "wikiIframe",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      allowlist: [],
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) =>
          attributes.src === null ? {} : { "data-src": String(attributes.src) },
      },
      ...wikiWidthPercentAttribute(),
      ...wikiAlignAttribute(),
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-iframe]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = node.attrs.src as string | null;

    if (!isWikiIframeSrcAllowed(src, this.options.allowlist))
      return renderWikiBlockedPlaceholder(
        HTMLAttributes,
        `Eingebettete Inhalte von dieser Domain sind nicht erlaubt: ${String(src ?? "")}`,
      );

    return [
      "div",
      mergeAttributes({ "data-wiki-iframe": "" }, HTMLAttributes),
      [
        "iframe",
        {
          src: String(src),
          sandbox:
            "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation",
          allow: "clipboard-write; encrypted-media; fullscreen",
          /**
           * Camel-cased for the React static renderer; the editor DOM is
           * unaffected (setAttribute lowercases HTML attribute names).
           */
          allowFullScreen: true,
          loading: "lazy",
          referrerPolicy: "strict-origin-when-cross-origin",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setWikiIframe:
        (attributes) =>
        ({ commands }) => {
          if (!isWikiIframeSrcAllowed(attributes.src, this.options.allowlist))
            return false;
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },
});
