import { mergeAttributes, Node } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";
import {
  wikiAlignAttribute,
  wikiWidthPxAttribute,
} from "./wikiResizableNodes.js";

export interface WikiRoleCitizensConfig {
  /** Role whose members are listed; null until one is picked */
  readonly roleId: string | null;
}

/**
 * Shared by the node's attribute parsing and the server-side resolution so both
 * agree.
 */
export const normalizeWikiRoleCitizensConfig = (
  attrs: Readonly<Record<string, unknown>> | undefined,
): WikiRoleCitizensConfig => ({
  roleId:
    typeof attrs?.roleId === "string" && attrs.roleId.length > 0
      ? attrs.roleId
      : null,
});

/**
 * So the server can resolve every role before rendering the page statically.
 */
export const collectWikiRoleCitizensRoleIds = (content: unknown): string[] => {
  const roleIds = new Set<string>();

  walkWikiContent(content, (node) => {
    if (node.type !== "wikiRoleCitizens") return;
    const { roleId } = normalizeWikiRoleCitizensConfig(node.attrs);
    if (roleId) roleIds.add(roleId);
  });

  return [...roleIds];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiRoleCitizens: {
      setWikiRoleCitizens: (
        attributes?: Partial<WikiRoleCitizensConfig>,
      ) => ReturnType;
    };
  }
}

/**
 * The node stores the role id only; the member list is resolved per viewer at
 * render time (and is permission-filtered server-side by role visibility), so
 * it never leaks into the document, `searchText` or the clipboard.
 */
export const WikiRoleCitizens = Node.create({
  name: "wikiRoleCitizens",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ...wikiWidthPxAttribute(),
      ...wikiAlignAttribute(),
      roleId: {
        default: null,
        parseHTML: (element) =>
          normalizeWikiRoleCitizensConfig({
            roleId: element.getAttribute("data-role-id"),
          }).roleId,
        renderHTML: (attributes) =>
          attributes.roleId === null
            ? {}
            : { "data-role-id": String(attributes.roleId) },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-role-citizens]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-wiki-role-citizens": "" }, HTMLAttributes),
      "Rollenmitglieder",
    ];
  },

  addCommands() {
    return {
      setWikiRoleCitizens:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...normalizeWikiRoleCitizensConfig(undefined),
              ...attributes,
            },
          });
        },
    };
  },
});
