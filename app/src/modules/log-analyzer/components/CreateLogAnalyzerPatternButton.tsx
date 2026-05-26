"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { CreateLogAnalyzerPatternModal } from "./CreateLogAnalyzerPatternModal";

interface Props {
  readonly className?: string;
}

export const CreateLogAnalyzerPatternButton = ({ className }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2 onClick={() => setIsOpen(true)} className={className}>
        <FaPlus />
        Neu
      </Button2>

      {isOpen && (
        <CreateLogAnalyzerPatternModal
          onRequestClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
