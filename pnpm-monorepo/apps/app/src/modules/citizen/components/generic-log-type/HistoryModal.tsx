"use client";

import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import type { GenericEntityLogType } from "@/types";
import { type Entity } from "@sam-monorepo/database/browser";
import { useState } from "react";
import { FaHistory } from "react-icons/fa";
import { HistoryModalVariant } from "./HistoryModalVariant";
import { ModalContent } from "./ModalContent";

interface Props {
  readonly type: GenericEntityLogType;
  readonly entity: Pick<Entity, "id">;
  readonly variant?: HistoryModalVariant;
  readonly showCreate?: boolean;
  readonly showDelete?: boolean;
  readonly showConfirm?: boolean;
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
  variant = HistoryModalVariant.Button,
  showCreate,
  showDelete,
  showConfirm,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const label = `${LOG_TYPE_LABELS[type]} History`;

  return (
    <>
      {variant === HistoryModalVariant.Button ? (
        <Button
          onClick={() => setIsOpen(true)}
          variant="tertiary"
          title={label}
          aria-label={label}
        >
          <FaHistory />
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={label}
          aria-label={label}
          className="cursor-pointer text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-300"
        >
          <FaHistory />
        </button>
      )}

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
