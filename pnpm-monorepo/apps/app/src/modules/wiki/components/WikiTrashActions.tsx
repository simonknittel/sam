"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { useState, useTransition } from "react";
import { FaTrash, FaTrashRestore } from "react-icons/fa";
import { destroyWikiPage } from "../actions/destroyWikiPage";
import { restoreWikiPage } from "../actions/restoreWikiPage";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly title: string;
}

export const WikiTrashActions = ({ className, pageId, title }: Props) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (action: (formData: FormData) => Promise<ActionResponse>) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", pageId);
      if (await runAction(action, formData)) setIsConfirmOpen(false);
    });
  };

  return (
    <span className={className}>
      <Button
        type="button"
        variant="tertiary"
        onClick={() => run(restoreWikiPage)}
        disabled={isPending}
        title="Seite wiederherstellen"
      >
        <FaTrashRestore /> Wiederherstellen
      </Button>

      <Button
        type="button"
        variant="tertiary"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        title="Seite endgültig löschen"
      >
        <FaTrash /> Endgültig löschen
      </Button>

      <Modal
        isOpen={isConfirmOpen}
        onRequestClose={() => setIsConfirmOpen(false)}
        className="w-120"
        heading={<h2>Endgültig löschen</h2>}
      >
        <p>
          Soll die Seite &quot;{title}&quot; inklusive aller Unterseiten
          endgültig gelöscht werden? Dies kann nicht rückgängig gemacht werden.
        </p>

        <Button2
          type="button"
          onClick={() => run(destroyWikiPage)}
          disabled={isPending}
          className="mt-4 ml-auto"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          Endgültig löschen
        </Button2>
      </Modal>
    </span>
  );
};
