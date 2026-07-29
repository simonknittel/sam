"use client";

import { Button2 } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";
import { useCreateWikiPage } from "./CreateWikiPageProvider";

interface Props {
  readonly className?: string;
}

export const CreateWikiPageButton = ({ className }: Props) => {
  const { openCreateWikiPageModal } = useCreateWikiPage();

  return (
    <Button2
      type="button"
      onClick={() => openCreateWikiPageModal()}
      className={clsx(className)}
      title="Neue Seite erstellen"
    >
      <FaPlus />
      <span className="hidden sm:inline">Neue Seite</span>
    </Button2>
  );
};
