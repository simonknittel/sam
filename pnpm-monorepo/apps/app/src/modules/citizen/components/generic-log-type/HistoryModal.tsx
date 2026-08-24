"use client";

import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import type { GenericEntityLogType } from "@/types";
import { type Entity } from "@sam-monorepo/database/browser";
import { useState } from "react";
import { FaHistory } from "react-icons/fa";
import { ModalContent } from "./ModalContent";

interface Props {
  type: GenericEntityLogType;
  entity: Pick<Entity, "id">;
  iconOnly?: boolean;
  showCreate?: boolean;
  showDelete?: boolean;
  showConfirm?: boolean;
}

/**
 * A citizen carries one history per log type, and several of them sit next
 * to each other — so each names itself after what it is a history of.
 */
const LOG_TYPE_LABELS: Record<GenericEntityLogType, string> = {
  handle: "Handle",
  "discord-id": "Discord ID",
  "teamspeak-id": "TeamSpeak ID",
  "citizen-id": "Citizen ID",
  "community-moniker": "Community Moniker",
};

export const HistoryModal = ({
  type,
  entity,
  iconOnly = false,
  showCreate,
  showDelete,
  showConfirm,
}: Readonly<Props>) => {
  const [isOpen, setIsOpen] = useState(false);
  const label = `${LOG_TYPE_LABELS[type]} History`;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="tertiary"
        title={label}
        aria-label={label}
      >
        <FaHistory /> {!iconOnly && <>History</>}
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-3xl"
        heading={<h2>{label}</h2>}
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
