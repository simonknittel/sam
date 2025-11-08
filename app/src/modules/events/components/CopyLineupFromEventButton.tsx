import { useAction } from "@/modules/actions/utils/useAction";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { type Event } from "@prisma/client";
import clsx from "clsx";
import { useState } from "react";
import { FaCopy, FaSpinner } from "react-icons/fa";
import { copyLineupFromEvent } from "../actions/copyLineupFromEvent";
import { EventSelectionInput } from "./EventSelectionInput";

interface Props {
  readonly className?: string;
  readonly targetEvent: Pick<Event, "id">;
}

export const CopyLineupFromEventButton = ({
  className,
  targetEvent,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isPending, formAction } = useAction(copyLineupFromEvent, {
    onSuccess: () => {
      setIsOpen(false);
    },
  });

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        title="Aufstellung aus einem anderen Event kopieren"
        variant="secondary"
        className={clsx(className)}
      >
        <FaCopy />
      </Button2>

      {isOpen && (
        <Modal
          isOpen={true}
          onRequestClose={() => setIsOpen(false)}
          className="w-[480px]"
          heading={<h2>Aufstellung aus einem anderen Event kopieren</h2>}
        >
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="targetEventId" value={targetEvent.id} />

            <EventSelectionInput name="sourceEventId" autoFocus />

            <Button2 type="submit" disabled={isPending} className="self-end">
              {isPending ? <FaSpinner className="animate-spin" /> : null}
              Kopieren
            </Button2>
          </form>
        </Modal>
      )}
    </>
  );
};
