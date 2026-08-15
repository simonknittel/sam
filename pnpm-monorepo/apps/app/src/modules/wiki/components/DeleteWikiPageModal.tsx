"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { useState } from "react";
import { FaTrash } from "react-icons/fa";
import { deleteWikiPage } from "../actions/deleteWikiPage";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly title: string;
  readonly descendantCount: number;
}

export const DeleteWikiPageModal = ({
  className,
  pageId,
  title,
  descendantCount,
}: Props) => {
  /** Inside a variant embed the action redirects back to the variant page */
  const { variantId } = useWikiPageHrefMode();
  const [isOpen, setIsOpen] = useState(false);
  /**
   * On success the action redirects to the wiki root, so there is no
   * success toast and no need to close the modal.
   */
  const { state, formAction, isPending } = useAction(deleteWikiPage, {
    errorToast: false,
  });

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Seite löschen"
      >
        <FaTrash />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Seite löschen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={pageId} />
          {variantId && (
            <input type="hidden" name="variantId" value={variantId} />
          )}

          <p>
            Soll die Seite &quot;{title}&quot;
            {descendantCount > 0 && (
              <>
                {" "}
                inklusive <strong>{descendantCount} Unterseite(n)</strong>
              </>
            )}{" "}
            gelöscht werden?
          </p>

          <Note
            type="info"
            className="mt-4"
            message="Gelöschte Seiten können 30 Tage lang aus dem Papierkorb wiederhergestellt werden."
          />

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaTrash />}
            Löschen
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
