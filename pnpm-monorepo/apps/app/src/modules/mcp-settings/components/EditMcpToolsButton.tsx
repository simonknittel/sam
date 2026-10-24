"use client";

import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { useState, type ReactNode } from "react";
import { FaTools } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly displayName: string;
  readonly clientHost: string;
  /** The list of the tools with their switches */
  readonly children: ReactNode;
}

export const EditMcpToolsButton = ({
  className,
  displayName,
  clientHost,
  children,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        className={className}
        type="button"
        variant="tertiary"
        onClick={() => setIsOpen(true)}
        aria-label={`Tools von ${displayName} bearbeiten`}
      >
        <FaTools /> Tools bearbeiten
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-200"
        heading={<h2>Tools bearbeiten</h2>}
      >
        <p className="mb-4 text-sm text-neutral-500">
          Jede Änderung gilt sofort für{" "}
          <span className="font-bold wrap-break-word text-neutral-50">
            {displayName}
          </span>{" "}
          <span className="break-all">({clientHost})</span>.
        </p>

        {children}
      </Modal>
    </>
  );
};
