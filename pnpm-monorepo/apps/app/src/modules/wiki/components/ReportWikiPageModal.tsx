"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { useState } from "react";
import { FaFlag } from "react-icons/fa";
import { createWikiPageReport } from "../actions/createWikiPageReport";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly title: string;
}

export const ReportWikiPageModal = ({ className, pageId, title }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction, isPending } = useAction(createWikiPageReport, {
    onSuccess: () => setIsOpen(false),
  });

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Seite melden"
      >
        <FaFlag />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Seite melden</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="pageId" value={pageId} />

          <p>
            Melde die Seite &quot;{title}&quot; den Wiki-Administratoren, z.B.
            wegen unangemessener oder veralteter Inhalte.
          </p>

          <Textarea
            name="message"
            label="Grund"
            required
            maxLength={2048}
            className="mt-4"
          />

          <Note
            type="info"
            className="mt-4"
            message="Die Meldung ist nicht anonym — Wiki-Administratoren sehen, wer sie erstellt hat."
          />

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaFlag />}
            Melden
          </Button2>

          {state && "error" in state && state.error && (
            <Note type="error" message={state.error} className="mt-4" />
          )}
        </form>
      </Modal>
    </>
  );
};
