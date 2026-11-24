import {
  getExtensionField,
  type AnyExtension,
  type JSONContent,
  type MarkdownTokenizer,
} from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import {
  Fragment,
  Mark,
  type NodeType,
  type Node as ProseMirrorNode,
  type Schema,
} from "@tiptap/pm/model";
import { Marked, type marked } from "marked";
import {
  getWikiEditorExtensions,
  getWikiEditorSchema,
} from "./wikiEditorExtensions.js";
import {
  WIKI_BLOCK_LAYOUT_ATTRIBUTES,
  WIKI_RESIZABLE_NODE_TYPES,
} from "./wikiResizableNodes.js";

export interface WikiMarkdownParseOptions {
  /**
   * The base URL of the app. Relative links and images resolve against it,
   * thus the content keeps only absolute URLs.
   */
  readonly baseUrl: string | URL;
}

const LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
]);

const IMAGE_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

/**
 * Where the blocks of the slow tokenizers can start: like the start of the
 * task list tokenizer, and a header row with a delimiter row like the check
 * of the table tokenizer
 */
const SLOW_TOKENIZER_BLOCK_STARTS: Readonly<Record<string, RegExp>> = {
  taskList: /^\s*[-+*]\s+\[[ xX]\]\s+/,
  table: /^[^\n]*\n(?=[^\n]*\|)[ \t|:]*-[ \t|:-]*(?:\n|$)/,
};

/**
 * The tokenizers of the task lists and of the tables split the rest of the
 * document into lines at the start of each block, thus a document with many
 * blocks takes quadratic time. Here they run only where their block starts.
 */
const withFastTokenizer = (extension: AnyExtension): AnyExtension => {
  const blockStart = SLOW_TOKENIZER_BLOCK_STARTS[extension.name];
  const tokenizer = getExtensionField<MarkdownTokenizer | undefined>(
    extension,
    "markdownTokenizer",
  );
  if (!blockStart || !tokenizer) return extension;

  const fastTokenizer: MarkdownTokenizer = {
    ...tokenizer,
    tokenize: (source, tokens, lexer) =>
      blockStart.test(source)
        ? tokenizer.tokenize(source, tokens, lexer)
        : undefined,
  };
  return extension.extend({ markdownTokenizer: fastTokenizer });
};

const createMarkdownManager = () => {
  /**
   * The manager adds the tokenizers of the extensions to its instance of
   * marked. The shared default instance would collect them again with each
   * parse.
   */
  const markedInstance = new Marked();
  const manager = new MarkdownManager({
    // The type of the option is the default instance; Tiptap's own tests
    // give an instance of `Marked` the same way
    marked: markedInstance as unknown as typeof marked,
    extensions: getWikiEditorExtensions().map(withFastTokenizer),
  });

  /**
   * The start functions of the block tokenizers only let the syntax of the
   * extensions interrupt a paragraph (the tokenizers still run at the start
   * of each block). marked calls them with the rest of the document for each
   * paragraph, thus a document with many paragraphs takes quadratic time.
   */
  const extensions = markedInstance.defaults.extensions;
  if (extensions) extensions.startBlock = undefined;

  return manager;
};

const resolveUrl = (
  value: unknown,
  baseUrl: string | URL,
  protocols: ReadonlySet<string>,
): string | null => {
  if (typeof value !== "string" || value.trim() === "") return null;

  let url: URL;
  try {
    url = new URL(value, baseUrl);
  } catch {
    return null;
  }

  return protocols.has(url.protocol) ? url.href : null;
};

/**
 * The parser can give a structure that the schema does not permit, for example
 * a heading in a list item or an image in a paragraph: such content becomes
 * plain paragraphs with the same text.
 */
const createConverter = (
  schema: Schema,
  { baseUrl }: WikiMarkdownParseOptions,
) => {
  const paragraphType = schema.nodes.paragraph;
  const linkType = schema.marks.link;
  if (!paragraphType || !linkType)
    throw new Error("The wiki schema has no paragraph or no link");

  const toMarks = (marks: JSONContent["marks"]): readonly Mark[] =>
    (marks ?? [])
      .flatMap((mark): Mark[] => {
        const markType = schema.marks[mark.type];
        if (!markType) return [];
        if (markType !== linkType) return [markType.create(mark.attrs)];

        const href = resolveUrl(mark.attrs?.href, baseUrl, LINK_PROTOCOLS);
        return href ? [linkType.create({ href })] : [];
      })
      // A mark can exclude a different one, for example the inline code all others
      .reduce<readonly Mark[]>((set, mark) => mark.addToSet(set), Mark.none);

  /** An image as a link to its source, for a place that cannot show it */
  const toImageLink = (image: ProseMirrorNode): ProseMirrorNode[] => {
    const source = String(image.attrs.src);
    const label =
      typeof image.attrs.alt === "string" && image.attrs.alt.trim() !== ""
        ? image.attrs.alt
        : source;
    return [schema.text(label, [linkType.create({ href: source })])];
  };

  const toParagraphContent = (block: ProseMirrorNode): ProseMirrorNode[] => {
    if (block.type.spec.code)
      return block.textContent
        .split("\n")
        .flatMap((line, index) => [
          ...(index > 0 && schema.nodes.hardBreak
            ? [schema.nodes.hardBreak.create()]
            : []),
          ...(line === "" ? [] : [schema.text(line)]),
        ]);

    return block.content.content.flatMap((child) =>
      child.isText
        ? [
            child.mark(
              child.marks.filter((mark) =>
                paragraphType.allowsMarkType(mark.type),
              ),
            ),
          ]
        : paragraphType.contentMatch.matchType(child.type)
          ? [child]
          : [],
    );
  };

  const toPlainParagraphs = (node: ProseMirrorNode): ProseMirrorNode[] => {
    if (node.type.name === "image")
      return [paragraphType.create(null, toImageLink(node))];
    if (node.isTextblock) {
      const content = toParagraphContent(node);
      return content.length > 0 ? [paragraphType.create(null, content)] : [];
    }
    if (node.isLeaf) return [];

    return node.content.content.flatMap(toPlainParagraphs);
  };

  /**
   * The children in the order of the content expression of the parent.
   * A child that does not fit becomes plain paragraphs. Null when the parent
   * cannot hold the children even then.
   */
  const fitBlocks = (
    parentType: NodeType,
    children: readonly ProseMirrorNode[],
  ): ProseMirrorNode[] | null => {
    const fitted: ProseMirrorNode[] = [];
    let match = parentType.contentMatch;

    for (const child of children) {
      const candidates = match.matchType(child.type)
        ? [child]
        : toPlainParagraphs(child);

      for (const candidate of candidates) {
        const next = match.matchType(candidate.type);
        if (!next) return null;

        fitted.push(candidate);
        match = next;
      }
    }

    if (match.validEnd) return fitted;

    const filling = match.fillBefore(Fragment.empty, true);
    return filling ? [...fitted, ...filling.content] : null;
  };

  /**
   * A text block with the inline children that it permits. A block child
   * (an image in a paragraph) splits the text block, thus the block is next
   * to the text in the parent.
   */
  const toTextblocks = (
    type: NodeType,
    attributes: JSONContent["attrs"],
    children: readonly ProseMirrorNode[],
  ): ProseMirrorNode[] => {
    const result: ProseMirrorNode[] = [];
    let inline: ProseMirrorNode[] = [];
    const flushInline = () => {
      if (inline.length > 0) result.push(type.create(attributes, inline));
      inline = [];
    };

    for (const child of children) {
      if (!child.isInline) {
        flushInline();
        result.push(child);
      } else if (child.isText) {
        const marks = child.marks.filter((mark) =>
          type.allowsMarkType(mark.type),
        );
        inline.push(child.mark(marks));
      } else if (type.contentMatch.matchType(child.type)) {
        inline.push(child);
      } else if (child.type.name === "hardBreak") {
        // For example a line break in a heading
        inline.push(schema.text(" "));
      }
    }
    flushInline();

    // An empty text block stays: an empty paragraph is an empty line
    return result.length > 0 ? result : [type.create(attributes)];
  };

  const toNodes = (json: JSONContent): ProseMirrorNode[] => {
    if (json.type === "text")
      return json.text ? [schema.text(json.text, toMarks(json.marks))] : [];

    const children = (json.content ?? []).flatMap(toNodes);
    const type = json.type ? schema.nodes[json.type] : undefined;
    if (!type) return toTextblocks(paragraphType, undefined, children);

    if (type.name === "image") {
      const source = resolveUrl(json.attrs?.src, baseUrl, IMAGE_PROTOCOLS);
      if (source) return [type.create({ ...json.attrs, src: source })];

      const alt = typeof json.attrs?.alt === "string" ? json.attrs.alt : "";
      return alt.trim() === ""
        ? []
        : [paragraphType.create(null, schema.text(alt))];
    }

    if (type.isTextblock) return toTextblocks(type, json.attrs, children);
    if (type.isLeaf) return [type.create(json.attrs)];

    const content = fitBlocks(type, children);
    return content
      ? [type.create(json.attrs, content)]
      : children.flatMap(toPlainParagraphs);
  };

  return { toNodes, fitBlocks };
};

const isEmptyParagraph = (node: ProseMirrorNode | undefined) =>
  node?.type.name === "paragraph" && node.childCount === 0;

const NESTED_LAYOUT = Object.fromEntries(
  WIKI_BLOCK_LAYOUT_ATTRIBUTES.map((attribute) => [attribute, null]),
);

/** See `stripWikiNestedBlockLayout` */
const withoutNestedLayout = (
  block: ProseMirrorNode,
  isNested = false,
): ProseMirrorNode => {
  if (block.isText) return block;

  const attributes =
    isNested &&
    (WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(block.type.name)
      ? { ...block.attrs, ...NESTED_LAYOUT }
      : block.attrs;
  const content = block.isTextblock
    ? block.content
    : block.content.content.map((child) => withoutNestedLayout(child, true));

  return block.type.create(attributes, content, block.marks);
};

/**
 * CommonMark with the tables and the task lists of GitHub. Content that the
 * wiki cannot hold in that place (for example a heading in a list item) becomes
 * plain paragraphs with the same text. HTML stays literal text. Links keep only
 * http, https and mailto URLs, images only http and https URLs.
 *
 * @throws Error when the result does not agree with the schema of the editor,
 * or when the nesting of the Markdown is too deep to parse
 */
export const parseMarkdownToWikiContent = (
  markdown: string,
  options: WikiMarkdownParseOptions,
): JSONContent => {
  const schema = getWikiEditorSchema();
  const parsed = createMarkdownManager().parse(markdown);

  const { toNodes, fitBlocks } = createConverter(schema, options);
  const blocks = (parsed.content ?? []).flatMap(toNodes);
  while (isEmptyParagraph(blocks[0])) blocks.shift();
  while (isEmptyParagraph(blocks.at(-1))) blocks.pop();

  const content = fitBlocks(schema.topNodeType, blocks);
  const document =
    content && content.length > 0
      ? schema.topNodeType.createAndFill(
          null,
          content.map((block) => withoutNestedLayout(block)),
        )
      : schema.topNodeType.createAndFill();
  if (!document) throw new Error("The Markdown does not fit the wiki schema");

  document.check();
  return document.toJSON() as JSONContent;
};
