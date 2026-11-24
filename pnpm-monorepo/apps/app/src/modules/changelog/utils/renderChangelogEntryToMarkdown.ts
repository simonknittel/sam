import type { ChangelogEntry } from "@/modules/changelog/types";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import rehypeRemark from "rehype-remark";
import { remark } from "remark";

/**
 * `@types/hast` is not a dependency of the app, thus the types of the HTML
 * syntax tree come from the signature of the plugin.
 */
type HastRoot = Parameters<ReturnType<typeof rehypeRemark>>[0];
type HastElement = Extract<HastRoot["children"][number], { type: "element" }>;
type HastContent = HastElement["children"][number];

interface ElementProps {
  readonly children?: ReactNode;
  readonly [name: string]: unknown;
}

type ServerComponent = (props: ElementProps) => ReactNode | Promise<ReactNode>;

const CLIENT_REFERENCE = Symbol.for("react.client.reference");

/** The other properties (classes, styles, handlers) have no Markdown form */
const MARKDOWN_PROPERTIES = ["href", "src", "alt", "title"] as const;

const URL_PROPERTIES = new Set<string>(["href", "src"]);

const processor = remark().use(rehypeRemark);

const createElement = (
  tagName: string,
  props: ElementProps,
  children: HastContent[],
  baseUrl: URL,
): HastElement => {
  const properties: HastElement["properties"] = {};

  for (const name of MARKDOWN_PROPERTIES) {
    const value = props[name];
    if (typeof value !== "string") continue;

    properties[name] = URL_PROPERTIES.has(name)
      ? new URL(value, baseUrl).href
      : value;
  }

  return { type: "element", tagName, properties, children };
};

const getImageSource = (src: unknown) => {
  if (typeof src === "string") return src;

  if (
    typeof src === "object" &&
    src !== null &&
    "src" in src &&
    typeof src.src === "string"
  )
    return src.src;

  return null;
};

const clientReferenceToHast = async (
  props: ElementProps,
  baseUrl: URL,
): Promise<HastContent[]> => {
  const children = await toHast(props.children, baseUrl);

  if (typeof props.href === "string")
    return [createElement("a", props, children, baseUrl)];

  const src = getImageSource(props.src);
  if (src) return [createElement("img", { ...props, src }, [], baseUrl)];

  return children;
};

const elementToHast = async (
  { type, props }: ReactElement<ElementProps>,
  baseUrl: URL,
): Promise<HastContent[]> => {
  if (typeof type === "string")
    return [
      createElement(
        type,
        props,
        await toHast(props.children, baseUrl),
        baseUrl,
      ),
    ];

  if (typeof type === "function") {
    if ("$$typeof" in type && type.$$typeof === CLIENT_REFERENCE)
      return clientReferenceToHast(props, baseUrl);

    return toHast(await (type as ServerComponent)(props), baseUrl);
  }

  // Fragments and the other built-in types of React
  return toHast(props.children, baseUrl);
};

const toHast = async (
  node: ReactNode,
  baseUrl: URL,
): Promise<HastContent[]> => {
  if (node === null || node === undefined || typeof node === "boolean")
    return [];

  if (
    typeof node === "string" ||
    typeof node === "number" ||
    typeof node === "bigint"
  )
    return [{ type: "text", value: String(node) }];

  if (isValidElement<ElementProps>(node)) return elementToHast(node, baseUrl);

  if (Symbol.iterator in node)
    return (
      await Promise.all(Array.from(node, (child) => toHast(child, baseUrl)))
    ).flat();

  return toHast(await node, baseUrl);
};

/**
 * Renders the body of a changelog entry to Markdown for the readers outside
 * the app (the MCP clients). Links and image sources become absolute URLs.
 *
 * `react-dom/server` is not available: the route handlers, the server
 * actions and the pages of Next.js run in the layer of the React Server
 * Components, which refuses the import, and in which a client component (for
 * example `Link` and `next/image`) is only a reference. Thus this function
 * converts the element tree into an HTML syntax tree itself, and
 * `rehype-remark` converts that tree into Markdown:
 *
 * - An HTML element keeps its children and the properties of
 *   `MARKDOWN_PROPERTIES`.
 * - The function calls a server component with its props. Hooks are not
 *   available, thus a component with hooks must be a client component.
 * - A client component reference with an `href` becomes a link, a reference
 *   with a `src` becomes an image. All other references give only their
 *   children.
 */
export const renderChangelogEntryToMarkdown = async (
  entry: Pick<ChangelogEntry, "body">,
  baseUrl: URL,
) => {
  const hast: HastRoot = {
    type: "root",
    children: await toHast(entry.body(), baseUrl),
  };

  return processor.stringify(await processor.run(hast)).trim();
};
