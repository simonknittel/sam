"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { FaPen } from "react-icons/fa";
import { useWikiEditMode } from "./WikiEditModeProvider";

interface Props {
  readonly className?: string;
}

export const WikiEditModeToggle = ({ className }: Props) => {
  const { isEditMode, setEditMode } = useWikiEditMode();

  return (
    <Button2
      type="button"
      variant={Button2Variant.IconOnly}
      className={className}
      tooltip={isEditMode ? "Bearbeitung beenden" : "Bearbeiten"}
      aria-pressed={isEditMode}
      onClick={() => setEditMode(!isEditMode)}
    >
      <FaPen className={isEditMode ? "text-interaction-500" : undefined} />
    </Button2>
  );
};
