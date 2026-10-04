"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useState } from "react";
import { FaFolderOpen, FaSave } from "react-icons/fa";
import { moveWikiPage } from "../actions/moveWikiPage";
import { WikiPageSelect } from "./WikiPageSelect";
import { WikiPageTargetsLoader } from "./WikiPageTargetsLoader";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly allowTopLevel: boolean;
  readonly currentParentId: string | null;
}

export const MoveWikiPageModal = ({
  className,
  pageId,
  allowTopLevel,
  currentParentId,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  /**
   * An error shows as a toast: when a different user deleted the page before,
   * the refreshed page has no modal anymore
   */
  const { formAction } = useAction(moveWikiPage, {
    onSuccess: () => setIsOpen(false),
  });

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Seite verschieben"
      >
        <FaFolderOpen />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Seite verschieben</h2>}
      >
        <WikiPageTargetsLoader excludeSubtreeOf={pageId}>
          {(targets) =>
            !allowTopLevel && targets.length === 0 ? (
              <Note
                type="info"
                message="Verschieben kannst du diese Seite nur in Seiten, die du verwaltest. Derzeit verwaltest du keine andere Seite."
              />
            ) : (
              <form action={formAction}>
                <input type="hidden" name="id" value={pageId} />

                <label className="mb-1 block">Neuer Ort</label>
                <WikiPageSelect
                  name="newParentId"
                  defaultValue={currentParentId ?? ""}
                  required={!allowTopLevel}
                  targets={targets}
                  emptyOptionLabel={allowTopLevel ? "Oberste Ebene" : undefined}
                />

                <Note
                  type="info"
                  className="mt-4"
                  message='Unterseiten und Einstellungen mit "Geerbt" übernehmen am neuen Ort die Berechtigungen der neuen übergeordneten Seiten. Dadurch kann sich die effektive Sichtbarkeit dieser Seite und ihrer Unterseiten ändern.'
                />

                <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
                  Verschieben
                </SubmitButton>
              </form>
            )
          }
        </WikiPageTargetsLoader>
      </Modal>
    </>
  );
};
