"use client";

import Modal from "@/modules/common/components/Modal";
import { CreateFlowForm, type DuplicationSource } from "./CreateFlowForm";

interface Props {
  readonly onRequestClose: () => void;
  /** Set when duplicating an existing flow, see CreateFlowForm */
  readonly source?: DuplicationSource | null;
}

/**
 * The management table's own modal chrome around `CreateFlowForm`. The top
 * bar's "Neu" menu reaches the same form through `CreateContext`, which
 * brings its own modal.
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
