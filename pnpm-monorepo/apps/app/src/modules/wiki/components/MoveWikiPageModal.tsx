"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { useState } from "react";
import { FaFolderOpen, FaSave } from "react-icons/fa";
import { moveWikiPage } from "../actions/moveWikiPage";
import type { WikiPageTargetOption } from "../utils/getEditableWikiPageTargets";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  /** Visible pages the viewer can edit, excluding the page's own subtree */
  readonly targets: readonly WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly currentParentId: string | null;
}

export const MoveWikiPageModal = ({
  className,
  pageId,
  targets,
  allowTopLevel,
  currentParentId,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, isPending } = useAction(moveWikiPage, {
    errorToast: false,
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

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Verschieben
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
