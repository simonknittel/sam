"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { useState } from "react";
import { FaFlag } from "react-icons/fa";
import { createWikiPageReport } from "../actions/createWikiPageReport";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly uploadId: string;
  readonly fileName: string;
}

export const ReportWikiAttachmentModal = ({
  className,
  pageId,
  uploadId,
  fileName,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, formAction } = useAction(createWikiPageReport, {
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
        tooltip="Dateianhang melden"
      >
        <FaFlag />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Dateianhang melden</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="pageId" value={pageId} />
          <input type="hidden" name="uploadId" value={uploadId} />

          <p>
            Melde den Dateianhang &quot;{fileName}&quot; den
            Wiki-Administratoren, z.B. wegen unangemessener oder veralteter
            Inhalte.
          </p>

          <Textarea
            name="message"
            label="Grund"
            required
            maxLength={2048}
            className="mt-4"
            autoFocus
          />

          <Note
            type="info"
            className="mt-4"
            message="Die Meldung ist nicht anonym — Wiki-Administratoren sehen, wer sie erstellt hat."
          />

          <SubmitButton icon={<FaFlag />} className="mt-4 ml-auto">
            Melden
          </SubmitButton>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
