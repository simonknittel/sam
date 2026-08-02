"use client";

import type { WikiGridVerticalAlign } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaTrash } from "react-icons/fa";
import { MdHeight, MdVerticalAlignCenter } from "react-icons/md";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import { WikiDuplicateCopyActions } from "./WikiDuplicateCopyActions";
import type { WikiBlockMenuState } from "./wikiEditMenuState";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiBlockMenuState;
}

/**
 * Actions of the generic container/leaf block menu (lists, quotes, code,
 * tables, rulers, collapsibles, grids).
 */
export const WikiBlockMenuActions = ({ editor, menu }: Props) => {
  const toggleGridVerticalAlign = (
    value: Exclude<WikiGridVerticalAlign, null>,
  ) => {
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(
          menu.position,
          "verticalAlign",
          menu.verticalAlign === value ? null : value,
        );
        return true;
      })
      .run();
  };

  /**
   * Focus at the deletion point — a bare focus() scrolls the stale
   * selection (wherever the cursor last was) into view, jumping the
   * viewport away from the deleted block (see WikiDuplicateCopyActions).
   */
  const deleteBlock = () => {
    editor
      .chain()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
      .focus(menu.position)
      .run();
  };

  return (
    <>
      {menu.typeName === "wikiGrid" && (
        <>
          <ToolbarButton
            title="Inhalte vertikal zentrieren"
            isActive={menu.verticalAlign === "center"}
            onClick={() => toggleGridVerticalAlign("center")}
          >
            <MdVerticalAlignCenter />
          </ToolbarButton>

          <ToolbarButton
            title="Inhalte auf gleiche Höhe strecken"
            isActive={menu.verticalAlign === "stretch"}
            onClick={() => toggleGridVerticalAlign("stretch")}
          >
            <MdHeight />
          </ToolbarButton>

          <ToolbarDivider />
        </>
      )}

      <WikiDuplicateCopyActions
        editor={editor}
        position={menu.position}
        typeNames={[menu.typeName]}
      />

      <ToolbarButton
        title="Block löschen"
        isActive={false}
        onClick={deleteBlock}
      >
        <FaTrash />
      </ToolbarButton>
    </>
  );
};
