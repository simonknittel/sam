"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useHotkeys } from "react-hotkeys-hook";
import { FaPen } from "react-icons/fa";
import { useWikiEditMode } from "./WikiEditModeProvider";

const EDIT_HOTKEY = "e";

interface Props {
  readonly className?: string;
}

export const WikiEditModeToggle = ({ className }: Props) => {
  const { isEditMode, setEditMode } = useWikiEditMode();

  /**
   * Enters edit mode only — leaving stays the button's job. Inside the editor
   * the key is just a character the user types, so toggling would fight with
   * writing. react-hotkeys-hook skips events from form fields and
   * contenteditable elements and only matches without modifiers, so typing in
   * the search, the page title or the editor doesn't trigger it either.
   */
  useHotkeys(EDIT_HOTKEY, () => setEditMode(true), { enabled: !isEditMode });

  return (
    <Button2
      type="button"
      variant={Button2Variant.IconOnly}
      className={className}
      tooltip={isEditMode ? "Bearbeitung beenden" : "Bearbeiten"}
      tooltipHotkey={isEditMode ? undefined : EDIT_HOTKEY}
      aria-keyshortcuts={isEditMode ? undefined : EDIT_HOTKEY}
      aria-pressed={isEditMode}
      onClick={() => setEditMode(!isEditMode)}
    >
      <FaPen className={isEditMode ? "text-interaction-500" : undefined} />
    </Button2>
  );
};
