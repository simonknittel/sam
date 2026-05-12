"use client";

import { type Entity } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import type { GenericEntityLogType } from "@/types";
import { useState } from "react";
import { FaHistory } from "react-icons/fa";
import { ModalContent } from "./ModalContent";

interface Props {
  type: GenericEntityLogType;
  entity: Entity;
  iconOnly?: boolean;
  showCreate?: boolean;
  showDelete?: boolean;
  showConfirm?: boolean;
}

export const HistoryModal = ({
  type,
  entity,
  iconOnly = false,
  showCreate,
  showDelete,
  showConfirm,
}: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="tertiary"
        title="History"
      >
        <FaHistory /> {!iconOnly && <>History</>}
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[768px]"
        heading={<h2>History</h2>}
      >
        <ModalContent
          type={type}
          entity={entity}
          showCreate={showCreate}
          showDelete={showDelete}
          showConfirm={showConfirm}
        />
      </Modal>
    </>
  );
};
