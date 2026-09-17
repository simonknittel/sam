"use client";

import { useHasLinkedCitizen } from "@/modules/auth/hooks/useHasLinkedCitizen";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { Fragment, useState } from "react";
import { FaFilter } from "react-icons/fa";
import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  EntryCategory,
} from "../utils/PATTERNS";
import { CitizenFilters } from "./CitizenFilters";
import { EntryTypeSettingsRow } from "./EntryTypeSettingsRow";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

/**
 * The button and the dialog with every setting of what the table shows and
 * what the upload sends: for each type the own entries, the sharing and the
 * entries of the other citizens, and below that the citizens themselves.
 */
export const EntrySettings = ({ className }: Props) => {
  const { isSharingAvailable } = useLogAnalyzerContext();
  const hasLinkedCitizen = useHasLinkedCitizen();
  const [isOpen, setIsOpen] = useState(false);

  /** The kill switch removes the two columns and the citizens of the sharing */
  const title = isSharingAvailable ? "Filter & Teilen" : "Filter";
  const columns = isSharingAvailable ? "1fr 8rem 8rem 8rem" : "1fr 8rem";

  return (
    <>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <FaFilter />
        {title}
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        heading={title}
        className="w-200"
      >
        {isSharingAvailable && (
          <p className="text-sm text-white/60 mb-4">
            {hasLinkedCitizen
              ? "Die Einträge der Typen mit aktiviertem Teilen werden auf den Server hochgeladen und sind für andere sichtbar."
              : "Zum Teilen muss dein Account mit einem Spynet-Citizen verknüpft sein."}
          </p>
        )}

        <Table columns={columns}>
          <THead>
            <th>Typ</th>
            <th className="text-center">Eigene anzeigen</th>
            {isSharingAvailable && (
              <>
                <th className="text-center">Teilen</th>
                <th className="text-center">Andere anzeigen</th>
              </>
            )}
          </THead>

          <TBody className="text-sm">
            {Object.values(EntryCategory).map((category) => (
              <Fragment key={category}>
                <TRow className="hover:bg-transparent">
                  <td className="col-span-full pt-2 font-mono uppercase text-xs text-white/40">
                    {ENTRY_CATEGORY_TITLES[category]}
                  </td>
                </TRow>

                {ENTRY_TYPES_BY_CATEGORY[category].map((type) => (
                  <EntryTypeSettingsRow
                    key={type}
                    type={type}
                    showSharingColumns={isSharingAvailable}
                    canShare={isSharingAvailable && hasLinkedCitizen}
                  />
                ))}
              </Fragment>
            ))}
          </TBody>
        </Table>

        {isSharingAvailable && (
          <CitizenFilters className="mt-4 border-t border-white/20 pt-4" />
        )}
      </Modal>
    </>
  );
};
