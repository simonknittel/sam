import type { JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import { formatWikiAttachmentSize } from "./formatWikiAttachmentSize.js";
import {
  resolveWikiCitizenMention,
  type WikiMentionedCitizen,
} from "./resolveWikiCitizenMention.js";
import {
  resolveWikiPageLink,
  type WikiLinkedPages,
} from "./resolveWikiPageLink.js";
import {
  resolveWikiVariantLink,
  wikiVariantLinkHref,
  type WikiLinkedVariant,
} from "./resolveWikiVariantLink.js";
import {
  WIKI_CALLOUT_COLORS,
  type WikiCalloutColor,
} from "./wikiCalloutNode.js";
import { WIKI_COLOR_LABELS } from "./wikiColorTokens.js";
import { getWikiEditorExtensions } from "./wikiEditorExtensions.js";
import { isAllowedWikiEmbedSrc } from "./wikiEmbedNode.js";

export interface WikiMarkdownOptions {
  /** The base URL of the app. Links to pages, ships and attachments use it. */
  readonly baseUrl: string | URL;
  /**
   * The pages that the reader can see, by id (see `WikiLinkedPages`). A link
   * to a page that is missing or null becomes a placeholder.
   */
  readonly pages?: WikiLinkedPages;
  /** The current handles of the mentioned citizens, by id */
  readonly citizens?: Readonly<Record<string, WikiMentionedCitizen>>;
  /** The current names of the linked variants, by id */
  readonly variants?: Readonly<Record<string, WikiLinkedVariant>>;
  /** The hostnames that generic iframes can embed (from the wiki settings) */
  readonly iframeAllowlist?: readonly string[];
}

type Children = string | string[] | undefined;

interface NodeProps {
  readonly node: ProseMirrorNode;
  readonly parent?: ProseMirrorNode;
  readonly children?: Children;
}

const LIST_NODE_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

const CALLOUT_LABELS: Readonly<Record<WikiCalloutColor, string>> = {
  neutral: "Neutral",
  blue: WIKI_COLOR_LABELS.blue,
  green: WIKI_COLOR_LABELS.green,
  yellow: WIKI_COLOR_LABELS.yellow,
  red: WIKI_COLOR_LABELS.red,
};

const EMBED_PROVIDER_LABELS: Readonly<Record<string, string>> = {
  youtube: "YouTube",
  twitch: "Twitch",
  spotify: "Spotify",
  google: "Google",
};

const toList = (children: Children): string[] => {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
};

const joinInline = (children: Children) => toList(children).join("");

const trimNewlines = (block: string) => block.replace(/^\n+|\n+$/g, "");

/** Block children, separated by one empty line. Empty blocks are dropped. */
const joinBlocks = (children: Children) =>
  toList(children)
    .map(trimNewlines)
    .filter((block) => block.trim() !== "")
    .join("\n\n");

const prefixLines = (text: string, prefix: string) =>
  text
    .split("\n")
    .map((line) => (line === "" ? prefix.trimEnd() : `${prefix}${line}`))
    .join("\n");

const escapeLinkText = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/[\\[\]]/g, "\\$&")
    .trim();

/**
 * An absolute http, https or mailto URL, or null for all other values (for
 * example `javascript:`). A relative URL resolves against the base URL.
 */
const toSafeUrl = (value: unknown, baseUrl: string | URL): string | null => {
  if (typeof value !== "string" || value === "") return null;

  let url: URL;
  try {
    url = new URL(value, baseUrl);
  } catch {
    return null;
  }

  return ["http:", "https:", "mailto:"].includes(url.protocol)
    ? url.href
    : null;
};

/** A parenthesis in the destination ends a Markdown link too early */
const toLinkDestination = (url: string) =>
  /[()]/.test(url) ? `<${url}>` : url;

const markdownLink = (text: string, url: string) =>
  `[${escapeLinkText(text) || url}](${toLinkDestination(url)})`;

/**
 * The page of the provider for an embed URL. A Twitch player without the
 * `parent` parameter of the embedding site shows only an error.
 */
const toEmbedPageUrl = (provider: string, src: string): string => {
  const url = new URL(src);

  if (provider === "youtube") {
    const videoId = url.pathname.split("/").filter(Boolean)[1] ?? "";
    const pageUrl = new URL("https://www.youtube.com/watch");
    pageUrl.searchParams.set("v", videoId);
    const start = url.searchParams.get("start");
    if (start) pageUrl.searchParams.set("t", `${start}s`);
    return pageUrl.href;
  }

  if (provider === "twitch") {
    const clip = url.searchParams.get("clip");
    if (clip)
      return new URL(`/${encodeURIComponent(clip)}`, "https://clips.twitch.tv")
        .href;

    const video = url.searchParams.get("video");
    if (video)
      return new URL(
        `/videos/${encodeURIComponent(video)}`,
        "https://www.twitch.tv",
      ).href;

    const channel = url.searchParams.get("channel") ?? "";
    return new URL(`/${encodeURIComponent(channel)}`, "https://www.twitch.tv")
      .href;
  }

  return url.href;
};

/**
 * A list item: the marker in front of the first line, the other lines
 * indented by the width of the marker. A nested list follows its paragraph
 * without an empty line, thus the list stays tight.
 */
const formatListItem = (
  marker: string,
  node: ProseMirrorNode,
  children: Children,
) => {
  const blocks = toList(children);
  let body = "";

  blocks.forEach((block, index) => {
    const text = trimNewlines(block);
    if (text.trim() === "") return;

    if (body !== "")
      body += LIST_NODE_TYPES.has(node.child(index).type.name) ? "\n" : "\n\n";
    body += text;
  });

  const indentation = " ".repeat(marker.length);
  const [firstLine = "", ...otherLines] = body.split("\n");

  return [
    `${marker}${firstLine}`,
    ...otherLines.map((line) => (line === "" ? "" : `${indentation}${line}`)),
  ].join("\n");
};

const getIndexInParent = (node: ProseMirrorNode, parent: ProseMirrorNode) => {
  let position = 0;
  parent.forEach((child, _offset, index) => {
    if (child === node) position = index;
  });
  return position;
};

const listItemMarker = (node: ProseMirrorNode, parent?: ProseMirrorNode) => {
  if (parent?.type.name !== "orderedList") return "- ";

  const start = Number(parent.attrs.start) || 1;
  return `${start + getIndexInParent(node, parent)}. `;
};

const codeFence = (code: string, minimumLength: number) => {
  const longestBacktickRun = Math.max(
    0,
    ...(code.match(/`+/g) ?? []).map((run) => run.length),
  );
  return "`".repeat(Math.max(minimumLength, longestBacktickRun + 1));
};

const renderImage = ({ node }: NodeProps, baseUrl: string | URL) => {
  const url = toSafeUrl(node.attrs.src, baseUrl);
  if (!url) return "[Bild]";

  const alt =
    typeof node.attrs.alt === "string" ? escapeLinkText(node.attrs.alt) : "";
  return `![${alt}](${toLinkDestination(url)})`;
};

const renderTableCell = ({ children }: NodeProps) =>
  joinBlocks(children).replace(/\n+/g, "<br>").replace(/[\\|]/g, "\\$&");

const createNodeMapping = ({
  baseUrl,
  pages = {},
  citizens = {},
  variants = {},
  iframeAllowlist = [],
}: WikiMarkdownOptions) => ({
  doc: ({ children }: NodeProps) => joinBlocks(children),
  text: ({ node }: NodeProps) => node.text ?? "",
  paragraph: ({ children }: NodeProps) => joinInline(children),
  heading: ({ node, children }: NodeProps) => {
    const text = joinInline(children)
      .replace(/\s*\n\s*/g, " ")
      .trim();
    if (text === "") return "";

    const level = Math.min(Math.max(Number(node.attrs.level) || 1, 1), 6);
    return `${"#".repeat(level)} ${text}`;
  },
  hardBreak: () => "\n",
  horizontalRule: () => "---",
  blockquote: ({ children }: NodeProps) =>
    prefixLines(joinBlocks(children), "> "),
  codeBlock: ({ node }: NodeProps) => {
    const code = node.textContent;
    const language =
      typeof node.attrs.language === "string" &&
      node.attrs.language !== "plaintext"
        ? node.attrs.language
        : "";
    const fence = codeFence(code, 3);
    return `${fence}${language}\n${code}\n${fence}`;
  },
  bulletList: ({ children }: NodeProps) =>
    toList(children).filter(Boolean).join("\n"),
  orderedList: ({ children }: NodeProps) =>
    toList(children).filter(Boolean).join("\n"),
  taskList: ({ children }: NodeProps) =>
    toList(children).filter(Boolean).join("\n"),
  listItem: ({ node, parent, children }: NodeProps) =>
    formatListItem(listItemMarker(node, parent), node, children),
  taskItem: ({ node, children }: NodeProps) =>
    formatListItem(node.attrs.checked ? "- [x] " : "- [ ] ", node, children),
  tableCell: renderTableCell,
  tableHeader: renderTableCell,
  image: (props: NodeProps) => renderImage(props, baseUrl),
  wikiFloatImage: (props: NodeProps) => renderImage(props, baseUrl),
  details: ({ children }: NodeProps) => joinBlocks(children),
  detailsSummary: ({ children }: NodeProps) => {
    const summary = joinInline(children)
      .replace(/\s*\n\s*/g, " ")
      .trim();
    return summary === "" ? "" : `**${summary}**`;
  },
  detailsContent: ({ children }: NodeProps) => joinBlocks(children),
  wikiGrid: ({ children }: NodeProps) => joinBlocks(children),
  wikiGridCell: ({ children }: NodeProps) => joinBlocks(children),
  wikiCallout: ({ node, children }: NodeProps) => {
    const color = WIKI_CALLOUT_COLORS.includes(node.attrs.color)
      ? (node.attrs.color as WikiCalloutColor)
      : "blue";
    const label = `**Hinweis (${CALLOUT_LABELS[color]})**`;
    const content = joinBlocks(children);

    return prefixLines(content ? `${label}\n\n${content}` : label, "> ");
  },
  wikiCitizenMention: ({ node }: NodeProps) => {
    const resolved = resolveWikiCitizenMention(citizens, node.attrs);
    return resolved ? `@${resolved.label}` : "@Unbekannt";
  },
  wikiPageLink: ({ node }: NodeProps) => {
    const resolved = resolveWikiPageLink(pages, node.attrs);
    const url = resolved && toSafeUrl(resolved.href, baseUrl);
    return resolved && url
      ? markdownLink(resolved.title, url)
      : "[Nicht verfügbare Seite]";
  },
  wikiVariantLink: ({ node }: NodeProps) => {
    const resolved = resolveWikiVariantLink(variants, node.attrs);
    const url =
      resolved && toSafeUrl(wikiVariantLinkHref(resolved.variantId), baseUrl);
    return resolved && url
      ? markdownLink(resolved.name, url)
      : "[Nicht verfügbares Schiff]";
  },
  wikiAttachment: ({ node }: NodeProps) => {
    const uploadId =
      typeof node.attrs.uploadId === "string" ? node.attrs.uploadId : "";
    if (uploadId === "") return "[Anhang]";

    const fileName =
      typeof node.attrs.fileName === "string" && node.attrs.fileName
        ? node.attrs.fileName
        : "Anhang";
    const size = formatWikiAttachmentSize(
      typeof node.attrs.size === "number" ? node.attrs.size : null,
    );
    const url = new URL(
      `/api/wiki/attachment/${encodeURIComponent(uploadId)}`,
      baseUrl,
    );

    return markdownLink(size ? `${fileName} (${size})` : fileName, url.href);
  },
  wikiEmbed: ({ node }: NodeProps) => {
    const provider = node.attrs.provider as unknown;
    const src = node.attrs.src as unknown;
    if (
      typeof provider !== "string" ||
      typeof src !== "string" ||
      !isAllowedWikiEmbedSrc(provider, src, iframeAllowlist)
    )
      return "[Blockierte Einbettung]";

    const label = EMBED_PROVIDER_LABELS[provider] ?? new URL(src).hostname;
    return markdownLink(`Einbettung: ${label}`, toEmbedPageUrl(provider, src));
  },
  wikiPageIndex: () => "[Seitenverzeichnis]",
  wikiRoleCitizens: () => "[Mitglieder einer Rolle]",
});

interface MarkProps {
  readonly mark: { readonly attrs: Record<string, unknown> };
  readonly children?: Children;
}

const plainMark = ({ children }: MarkProps) => joinInline(children);

const createMarkMapping = ({ baseUrl }: WikiMarkdownOptions) => ({
  code: ({ children }: MarkProps) => {
    const code = joinInline(children);
    const fence = codeFence(code, 1);
    const padding = code.startsWith("`") || code.endsWith("`") ? " " : "";
    return `${fence}${padding}${code}${padding}${fence}`;
  },
  link: ({ mark, children }: MarkProps) => {
    const text = joinInline(children);
    const url = toSafeUrl(mark.attrs.href, baseUrl);
    return url ? `[${text}](${toLinkDestination(url)})` : text;
  },
  // Only the look of the text: Markdown has no equivalent
  underline: plainMark,
  highlight: plainMark,
  wikiTextColor: plainMark,
  wikiSmallText: plainMark,
});

/**
 * Renders the Tiptap JSON of a wiki page as Markdown, for readers outside
 * the app (for example the MCP server). The nodes of the wiki that Markdown
 * does not have get a readable fallback: a callout becomes a block quote
 * with a label, a mention becomes `@handle`, page links, ship links,
 * attachments and embeds become links to the app or to the provider, a grid
 * becomes its columns in sequence. The page index, the role members, blocked
 * embeds and unknown nodes become a short placeholder in square brackets.
 */
export const renderWikiContentToMarkdown = (
  content: unknown,
  options: WikiMarkdownOptions,
): string => {
  if (!content || typeof content !== "object") return "";

  const markdown = renderToMarkdown({
    content: content as JSONContent,
    extensions: getWikiEditorExtensions(),
    options: {
      nodeMapping: createNodeMapping(options),
      markMapping: createMarkMapping(options),
      unhandledNode: () => "[Nicht unterstützter Inhalt]",
      unhandledMark: plainMark,
    },
  });

  const trimmed = trimNewlines(markdown);
  return trimmed === "" ? "" : `${trimmed}\n`;
};
