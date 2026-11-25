"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { Table, TBody, THead } from "@/modules/common/components/Table";
import { Fragment, useState } from "react";
import { FaFilter } from "react-icons/fa";
import { ENTRY_TYPES_BY_CATEGORY, EntryCategory } from "../utils/PATTERNS";
import { CitizenFilters } from "./CitizenFilters";
import { EntryCategorySettingsRow } from "./EntryCategorySettingsRow";
import { EntryTypeSettingsRow } from "./EntryTypeSettingsRow";

interface Props {
  readonly className?: string;
}

export const EntrySettings = ({ className }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <FaFilter />
        Filter
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        heading="Filter"
        className="w-160"
      >
        <p className="mb-4 text-sm text-white/60">
          Die Filter wirken sich nur auf die Tabelle aus. Was du teilst, legst
          du im Remote Control Program fest.
        </p>

        <Table columns="1fr 8rem 8rem">
          <THead>
            <th>Typ</th>
            <th className="text-center">Eigene anzeigen</th>
            <th className="text-center">Andere anzeigen</th>
          </THead>

          <TBody className="text-sm">
            {Object.values(EntryCategory).map((category) => (
              <Fragment key={category}>
                <EntryCategorySettingsRow category={category} />

                {ENTRY_TYPES_BY_CATEGORY[category].map((type) => (
                  <EntryTypeSettingsRow key={type} type={type} />
                ))}
              </Fragment>
            ))}
          </TBody>
        </Table>

        <CitizenFilters className="mt-4 border-t border-white/20 pt-4" />
      </Modal>
    </>
  );
};
