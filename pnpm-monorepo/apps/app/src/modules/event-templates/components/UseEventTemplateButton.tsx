"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import { FaCalendarPlus } from "react-icons/fa";

interface Props {
  readonly templateId: string;
  /** Renders a labelled button instead of the table's icon-only one */
  readonly withLabel?: boolean;
}

/**
 * Opens the app-wide create-event modal with this template preselected — the
 * same form and the same action the top bar's "Neu" menu reaches.
 */
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
