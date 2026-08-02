"use client";

import { WIKI_RESIZABLE_NODE_TYPES } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaCog, FaDownload, FaExternalLinkAlt, FaTrash } from "react-icons/fa";
import { ALIGNMENT_OPTIONS } from "../toolbar/alignments";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import { insertWikiEmbedFromUrl } from "../wikiEditorEmbeds";
import { openInNewTab } from "./openInNewTab";
import { WikiDuplicateCopyActions } from "./WikiDuplicateCopyActions";
import { URL_NODE_TYPES, type WikiNodeMenuState } from "./wikiEditMenuState";
import { WikiEditMenuUrlForm } from "./WikiEditMenuUrlForm";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiNodeMenuState;
  /** Opens the page-index config dialog (mounted by the menu shell) */
  readonly onOpenPageIndexConfig: (config: {
    readonly position: number;
    readonly attrs: Readonly<Record<string, unknown>>;
  }) => void;
}

/**
 * Actions of the atom-node menu (embeds, images, attachments, page links,
 * mentions, page indexes).
 */
export const WikiNodeMenuActions = ({
  editor,
  menu,
  onOpenPageIndexConfig,
}: Props) => {
  /**
   * Focus at the deletion point — a bare focus() scrolls the stale
   * selection (wherever the cursor last was) into view, jumping the
   * viewport away from the deleted block (see WikiDuplicateCopyActions).
   */
  const deleteNode = () => {
    editor
      .chain()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
      .focus(menu.position)
      .run();
  };

  const saveNodeUrl = (url: string) => {
    /**
     * Select the node first — the insert helper replaces the current
     * selection.
     */
    editor.commands.setNodeSelection(menu.position);
    void insertWikiEmbedFromUrl(editor, url);
  };

  const setNodeAlignment = (value: string) => {
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(
          menu.position,
          "align",
          value === "left" ? null : value,
        );
        return true;
      })
      .run();
  };

  return (
    <>
      {URL_NODE_TYPES.includes(menu.typeName) && (
        <WikiEditMenuUrlForm defaultValue={menu.src} onSave={saveNodeUrl} />
      )}

      {menu.typeName === "wikiAttachment" && (
        <ToolbarButton
          title="Herunterladen"
          isActive={false}
          onClick={() =>
            openInNewTab(
              `/api/wiki/attachment/${encodeURIComponent(menu.uploadId)}`,
            )
          }
        >
          <FaDownload />
        </ToolbarButton>
      )}

      {menu.typeName === "wikiPageLink" && (
        <ToolbarButton
          title="Seite öffnen"
          isActive={false}
          onClick={() =>
            openInNewTab(`/app/wiki/${encodeURIComponent(menu.pageId)}`)
          }
        >
          <FaExternalLinkAlt />
        </ToolbarButton>
      )}

      {menu.typeName === "wikiCitizenMention" && (
        <ToolbarButton
          title="Spynet öffnen"
          isActive={false}
          onClick={() =>
            openInNewTab(
              `/app/spynet/citizen/${encodeURIComponent(menu.citizenId)}`,
            )
          }
        >
          <FaExternalLinkAlt />
        </ToolbarButton>
      )}

      {menu.typeName === "wikiPageIndex" && (
        <ToolbarButton
          title="Konfigurieren"
          isActive={false}
          onClick={() =>
            onOpenPageIndexConfig({
              position: menu.position,
              attrs: menu.attrs,
            })
          }
        >
          <FaCog />
        </ToolbarButton>
      )}

      {URL_NODE_TYPES.includes(menu.typeName) && menu.src && (
        <ToolbarButton
          title="In neuem Tab öffnen"
          isActive={false}
          onClick={() => openInNewTab(menu.src)}
        >
          <FaExternalLinkAlt />
        </ToolbarButton>
      )}

      {(WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(
        menu.typeName,
      ) &&
        ALIGNMENT_OPTIONS.map(({ value, title, icon: Icon }) => (
          <ToolbarButton
            key={value}
            title={title}
            isActive={menu.align === value}
            onClick={() => setNodeAlignment(value)}
          >
            <Icon />
          </ToolbarButton>
        ))}

      <ToolbarDivider />

      <WikiDuplicateCopyActions
        editor={editor}
        position={menu.position}
        typeNames={[menu.typeName]}
      />

      <ToolbarButton title="Löschen" isActive={false} onClick={deleteNode}>
        <FaTrash />
      </ToolbarButton>
    </>
  );
};
