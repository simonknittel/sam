import { mergeAttributes, Node } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";

/**
 * The node's configuration. The document only ever stores the role — its
 * members are resolved per viewer at render time (editor node view and
 * static renderer alike) and never become part of the content.
 */
export interface WikiRoleCitizensConfig {
  /** Role whose members are listed; null until one is picked */
  readonly roleId: string | null;
}

/**
 * Clamps arbitrary (user-controlled) attribute input into a valid config.
 * Shared by the node's attribute parsing and the server-side resolution so
 * both agree.
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
 * The distinct roles referenced by the role-member nodes of a Tiptap JSON
 * document — so the server can resolve every one of them before rendering
 * the page statically. The role id doubles as the lookup key; unlike the
 * page index there is nothing else to configure.
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
      /** Inserts a role member list ("Rollenmitglieder") at the current position */
      setWikiRoleCitizens: (
        attributes?: Partial<WikiRoleCitizensConfig>,
      ) => ReturnType;
    };
  }
}

/**
 * A block listing the citizens a role is assigned to. The node stores the
 * role id only; the member list is resolved per viewer at render time (and
 * is permission-filtered server-side by role visibility), so it never leaks
 * into the document, `searchText` or the clipboard.
 */
export const WikiRoleCitizens = Node.create({
  name: "wikiRoleCitizens",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
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

  /**
   * Fallback rendering (e.g. clipboard serialization) — the app overrides
   * this with a resolved member list via node view and static node mapping.
   */
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
