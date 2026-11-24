"use client";

import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { GrantCustomNameInput } from "@/modules/mcp-settings/components/GrantCustomNameInput";
import { useState, type FormEvent } from "react";
import { FaCheck, FaPen } from "react-icons/fa";

interface Props {
  readonly customName: string;
  readonly clientName: string;
  readonly onChange: (customName: string) => void;
}

/** Only the approval saves the name */
export const ConsentCustomNameButton = ({
  customName,
  clientName,
  onChange,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(customName);

  const open = () => {
    setDraft(customName);
    setIsOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onChange(draft.trim());
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="tertiary"
        onClick={open}
        aria-label="Name ändern"
      >
        <FaPen /> Ändern
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Client benennen</h2>}
      >
        <form onSubmit={handleSubmit}>
          <GrantCustomNameInput
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            clientName={clientName}
          />

          <Button2 type="submit" className="mt-4 ml-auto">
            <FaCheck /> Übernehmen
          </Button2>
        </form>
      </Modal>
    </>
  );
};
