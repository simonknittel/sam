"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import clsx from "clsx";
import { useState } from "react";
import { FaHistory } from "react-icons/fa";
import { restoreWikiPageSnapshot } from "../actions/restoreWikiPageSnapshot";

interface Props {
  readonly className?: string;
  readonly snapshotId: string;
  readonly name: string;
}

export const WikiSnapshotRestoreButton = ({
  className,
  snapshotId,
  name,
}: Props) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { formAction, isPending } = useAction(restoreWikiPageSnapshot, {
    onSuccess: () => setIsConfirmOpen(false),
  });

  return (
    /**
     * inline-flex, not a bare inline span: the button inside is a flex box,
     * which would otherwise split the span into anonymous block boxes whose
     * border box covers the button.
     */
    <span className={clsx("inline-flex", className)}>
      <Button
        type="button"
        variant="tertiary"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        title="Snapshot wiederherstellen"
      >
        <FaHistory /> Wiederherstellen
      </Button>

      <Modal
        isOpen={isConfirmOpen}
        onRequestClose={() => setIsConfirmOpen(false)}
        className="w-120"
        heading={<h2>Snapshot wiederherstellen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="snapshotId" value={snapshotId} />

          <p>
            Soll der Snapshot &quot;{name}&quot; als aktueller Inhalt der Seite
            wiederhergestellt werden?
          </p>

          <p className="mt-2 text-sm text-neutral-400">
            Der aktuelle Stand wird vorher automatisch als Snapshot gesichert.
          </p>

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaHistory />}
            Wiederherstellen
          </Button2>
        </form>
      </Modal>
    </span>
  );
};
