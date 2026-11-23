"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import type { OwnShareGrant } from "@sam-monorepo/application";
import { useNow } from "next-intl";
import { useId, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { ShareGrantForm } from "./ShareGrantForm";
import { ShareGrantListItem } from "./ShareGrantListItem";
import { SharingPopoverSection } from "./SharingPopoverSection";

/** The remaining times of the grants change each minute */
const CLOCK_INTERVAL_MILLISECONDS = 60_000;

interface Props {
  /** The active grants, the newest first */
  readonly grants: readonly OwnShareGrant[];
  readonly maximumActiveGrantCount: number;
  readonly canChooseCitizen: boolean;
  readonly canChooseRole: boolean;
}

/** The section "Shared with others": the active grants and a new grant */
export const SharedWithOthersSection = ({
  grants,
  maximumActiveGrantCount,
  canChooseCitizen,
  canChooseRole,
}: Props) => {
  const now = useNow({ updateInterval: CLOCK_INTERVAL_MILLISECONDS });

  return (
    <SharingPopoverSection heading="Mit anderen geteilt">
      {grants.length > 0 ? (
        <ul className="-my-2 divide-y divide-white/10">
          {grants.map((grant) => (
            <ShareGrantListItem key={grant.id} grant={grant} now={now} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">
          Du teilst nichts mit anderen.
        </p>
      )}

      {grants.length < maximumActiveGrantCount ? (
        <NewShareGrant
          canChooseCitizen={canChooseCitizen}
          canChooseRole={canChooseRole}
        />
      ) : (
        <p className="text-sm text-neutral-500">
          Du hast {maximumActiveGrantCount} aktive Freigaben. Widerrufe eine
          Freigabe, um eine neue zu erstellen.
        </p>
      )}
    </SharingPopoverSection>
  );
};

interface NewShareGrantProps {
  readonly canChooseCitizen: boolean;
  readonly canChooseRole: boolean;
}

/** A button that shows the form for a new grant */
const NewShareGrant = ({
  canChooseCitizen,
  canChooseRole,
}: NewShareGrantProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const formId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  /** The focus goes back to the button, because the form disappears */
  const closeForm = () => {
    setIsFormOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      <Button2
        ref={toggleRef}
        type="button"
        variant={Button2Variant.Secondary}
        aria-expanded={isFormOpen}
        aria-controls={isFormOpen ? formId : undefined}
        onClick={() => setIsFormOpen((isOpen) => !isOpen)}
        className="w-full"
      >
        <FaPlus />
        Neue Freigabe
      </Button2>

      {isFormOpen && (
        <ShareGrantForm
          id={formId}
          canChooseCitizen={canChooseCitizen}
          canChooseRole={canChooseRole}
          onClose={closeForm}
        />
      )}
    </div>
  );
};
