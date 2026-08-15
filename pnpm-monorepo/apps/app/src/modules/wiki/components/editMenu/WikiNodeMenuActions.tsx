"use client";

import { WIKI_RESIZABLE_NODE_TYPES } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import {
  FaCog,
  FaDownload,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaTrash,
} from "react-icons/fa";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import { insertWikiEmbedFromUrl } from "../wikiEditorEmbeds";
import { openInNewTab } from "./openInNewTab";
import { WikiBlockLayoutActions } from "./WikiBlockLayoutActions";
import { WikiDuplicateCopyActions } from "./WikiDuplicateCopyActions";
import {
  CONFIGURABLE_NODE_TYPES,
  URL_NODE_TYPES,
  type WikiNodeMenuState,
} from "./wikiEditMenuState";
import { WikiEditMenuUrlForm } from "./WikiEditMenuUrlForm";
import { WikiImageFloatActions } from "./WikiImageFloatActions";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiNodeMenuState;
  /** Opens the node's config dialog (mounted by the menu shell) */
  readonly onOpenNodeConfig: (config: {
    readonly typeName: string;
    readonly position: number;
    readonly attrs: Readonly<Record<string, unknown>>;
  }) => void;
  /** Opens the ship picker for an existing link (mounted by the menu shell) */
  readonly onOpenVariantLink: (config: { readonly position: number }) => void;
}

/**
 * Actions of the atom-node menu (embeds, images, attachments, page links,
 * mentions, variant links, page indexes, role member lists).
 */
export const WikiNodeMenuActions = ({
  editor,
  menu,
  onOpenNodeConfig,
  onOpenVariantLink,
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

  return (
    <>
      {URL_NODE_TYPES.includes(menu.typeName) && (
        <WikiEditMenuUrlForm defaultValue={menu.src} onSave={saveNodeUrl} />
      )}

      {(menu.typeName === "image" || menu.typeName === "wikiFloatImage") &&
        menu.src && (
          <ToolbarButton
            title="Original öffnen"
            isActive={false}
            onClick={() => openInNewTab(menu.src)}
          >
            <FaExternalLinkAlt />
          </ToolbarButton>
        )}

      {(menu.typeName === "image" || menu.typeName === "wikiFloatImage") && (
        <WikiImageFloatActions
          editor={editor}
          position={menu.position}
          floatSide={
            menu.typeName === "wikiFloatImage"
              ? menu.attrs.floatSide === "right"
                ? "right"
                : "left"
              : null
          }
        />
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

      {menu.typeName === "wikiVariantLink" && (
        <>
          <ToolbarButton
            title="Schiff öffnen"
            isActive={false}
            onClick={() =>
              openInNewTab(
                `/app/fleet/variant/${encodeURIComponent(menu.variantId)}`,
              )
            }
          >
            <FaExternalLinkAlt />
          </ToolbarButton>

          <ToolbarButton
            title="Schiff ändern"
            isActive={false}
            onClick={() => onOpenVariantLink({ position: menu.position })}
          >
            <FaExchangeAlt />
          </ToolbarButton>
        </>
      )}

      {CONFIGURABLE_NODE_TYPES.includes(menu.typeName) && (
        <ToolbarButton
          title="Konfigurieren"
          isActive={false}
          onClick={() =>
            onOpenNodeConfig({
              typeName: menu.typeName,
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
        menu.topLevel && (
          <WikiBlockLayoutActions
            editor={editor}
            position={menu.position}
            widthPx={menu.widthPx}
            align={menu.align}
          />
        )}

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
