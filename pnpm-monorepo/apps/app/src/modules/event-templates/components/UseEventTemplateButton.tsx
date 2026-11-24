"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import { FaCalendarPlus } from "react-icons/fa";

interface Props {
  readonly templateId: string;
  readonly withLabel?: boolean;
}

export const UseEventTemplateButton = ({ templateId, withLabel }: Props) => {
  const { openCreateModal } = useCreateContext();
  const open = () => openCreateModal("event", { templateId });

  return withLabel ? (
    <Button2 type="button" onClick={open}>
      <FaCalendarPlus />
      Verwenden
    </Button2>
  ) : (
    <Button2
      type="button"
      variant={Button2Variant.IconOnly}
      tooltip="Verwenden"
      onClick={open}
    >
      <FaCalendarPlus />
    </Button2>
  );
};
