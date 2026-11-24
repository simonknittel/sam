"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { useState } from "react";
import { FaCalendarDays } from "react-icons/fa6";
import type { DateRange } from "../utils/entryWindow";
import { DateRangeForm } from "./DateRangeForm";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const formatDay = (day: string) => day.split("-").toReversed().join(".");

const formatDateRange = ({ from, to }: DateRange) => {
  if (from && to) return `${formatDay(from)} – ${formatDay(to)}`;
  if (from) return `Ab ${formatDay(from)}`;
  if (to) return `Bis ${formatDay(to)}`;
  return null;
};

interface Props {
  /** See `LogSelection` */
  readonly oldestSessionStart: number | null;
  readonly className?: string;
}

/**
 * Only the dates of the range show, so that the status stays next to the button
 */
export const DateRangeSettings = ({ oldestSessionStart, className }: Props) => {
  const { dateRange } = useLogAnalyzerContext();
  const [isOpen, setIsOpen] = useState(false);

  const activeRange = formatDateRange(dateRange);

  return (
    <>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label={activeRange ? `Zeitraum: ${activeRange}` : undefined}
      >
        <FaCalendarDays />
        {activeRange ?? "Zeitraum"}
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        heading="Zeitraum"
        className="w-120"
      >
        {/* The dialog removes the form while it is closed, thus a draft
            which the user did not apply does not come back. */}
        <DateRangeForm
          oldestSessionStart={oldestSessionStart}
          onClose={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
};
