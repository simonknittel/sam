"use client";

import type { Editor } from "@tiptap/react";
import toast from "react-hot-toast";
import { FaExternalLinkAlt, FaUnlink } from "react-icons/fa";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { openInNewTab } from "./openInNewTab";
import type { WikiLinkMenuState } from "./wikiEditMenuState";
import { WikiEditMenuUrlForm } from "./WikiEditMenuUrlForm";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiLinkMenuState;
}

/** Actions of the plain-link menu (edit, open, remove) */
export const WikiLinkMenuActions = ({ editor, menu }: Props) => {
  const saveLink = (href: string) => {
    const trimmed = href.trim();
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "http:")
        throw new Error("Unsupported protocol");
    } catch {
      toast.error("Bitte eine gültige URL angeben (https://…).");
      return;
    }
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
  };

  const removeLink = () => {
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .extendMarkRange("link")
      .unsetLink()
      .run();
  };

  return (
    <>
      <WikiEditMenuUrlForm defaultValue={menu.href} onSave={saveLink} />
      {menu.href && (
        <ToolbarButton
          title="In neuem Tab öffnen"
          isActive={false}
          onClick={() => openInNewTab(menu.href)}
        >
          <FaExternalLinkAlt />
        </ToolbarButton>
      )}

      <ToolbarButton
        title="Link entfernen"
        isActive={false}
        onClick={removeLink}
      >
        <FaUnlink />
      </ToolbarButton>
    </>
  );
};
