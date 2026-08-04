"use client";

import { Button2 } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { FaPlus } from "react-icons/fa";
import { useCreateWikiPage } from "./CreateWikiPageProvider";

interface Props {
  readonly className?: string;
  /**
   * Shown disabled when there is nowhere to create: the viewer manages no
   * page and may not create at the top level either.
   */
  readonly canCreate: boolean;
}

export const CreateWikiPageButton = ({ className, canCreate }: Props) => {
  const { openCreateWikiPageModal } = useCreateWikiPage();

  return (
    <Button2
      type="button"
      onClick={() => openCreateWikiPageModal()}
      disabled={!canCreate}
      className={clsx(className)}
      title={
        canCreate
          ? "Neue Seite erstellen"
          : "Neue Seiten kannst du nur in Seiten anlegen, die du verwaltest"
      }
    >
      <FaPlus />
      <span className="hidden sm:inline">Neue Seite</span>
    </Button2>
  );
};
