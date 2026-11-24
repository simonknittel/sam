"use client";

import Modal from "@/modules/common/components/Modal";
import { CreateFlowForm, type DuplicationSource } from "./CreateFlowForm";

interface Props {
  readonly onRequestClose: () => void;
  readonly source?: DuplicationSource | null;
}

/**
 * The "Neu" menu of the top bar shows `CreateFlowForm` in the modal of
 * `CreateContext` instead
 */
export const CreateFlowModal = ({ onRequestClose, source }: Props) => {
  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={
        <h2>{source ? "Karrierebaum duplizieren" : "Karrierebaum anlegen"}</h2>
      }
    >
      <CreateFlowForm onSuccess={onRequestClose} source={source} />
    </Modal>
  );
};

export type { DuplicationSource };
