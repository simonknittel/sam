"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createRoleTag } from "../../actions/createRoleTag";
import { RoleTagFields } from "./RoleTagFields";

/** The action opens the page of the new tag */
export const CreateRoleTagButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2 onClick={() => setIsOpen(true)}>
        <FaPlus />
        Neuer Tag
      </Button2>

      {isOpen && <CreateRoleTagModal onRequestClose={() => setIsOpen(false)} />}
    </>
  );
};

interface CreateRoleTagModalProps {
  readonly onRequestClose: () => void;
}

/** A new modal for each open: the form starts empty */
const CreateRoleTagModal = ({ onRequestClose }: CreateRoleTagModalProps) => {
  const { state, isPending, submitWithoutReset } = useAction(createRoleTag, {
    errorToast: false,
  });

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Neuer Tag</h2>}
    >
      <form onSubmit={submitWithoutReset}>
        <RoleTagFields autoFocus />

        <ActionErrorNote className="mt-4" state={state} />

        <div className="mt-8 flex justify-end">
          <Button2 type="submit" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>
        </div>
      </form>
    </Modal>
  );
};
