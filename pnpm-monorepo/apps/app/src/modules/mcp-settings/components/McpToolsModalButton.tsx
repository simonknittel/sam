"use client";

import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { useState, type ReactNode } from "react";
import { FaTools } from "react-icons/fa";

interface Props {
  readonly className?: string;
  /** The text of the button */
  readonly label: string;
  /** The accessible name of the button, when the text alone is not clear */
  readonly ariaLabel?: string;
  readonly heading: string;
  /** The text above the list of the tools */
  readonly description: ReactNode;
  /** The list of the tools with their switches */
  readonly children: ReactNode;
}

/** A button that opens the tools of a client in a modal */
export const McpToolsModalButton = ({
  className,
  label,
  ariaLabel,
  heading,
  description,
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
        aria-label={ariaLabel}
      >
        <FaTools /> {label}
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-200"
        heading={<h2>{heading}</h2>}
      >
        <p className="mb-4 text-sm text-neutral-500">{description}</p>

        {children}
      </Modal>
    </>
  );
};
