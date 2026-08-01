"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { WikiPageSidebarMode } from "@sam-monorepo/database/browser";
import { useState } from "react";
import { FaRegEyeSlash, FaSave } from "react-icons/fa";
import { updateWikiPageSidebarMode } from "../actions/updateWikiPageSidebarMode";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly sidebarMode: WikiPageSidebarMode;
}

export const WikiPageSidebarModeModal = ({
  className,
  pageId,
  sidebarMode,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>(sidebarMode);
  const { state, formAction, isPending } = useAction(
    updateWikiPageSidebarMode,
    {
      errorToast: false,
      onSuccess: () => setIsOpen(false),
    },
  );

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Sichtbarkeit in der Seitenleiste"
      >
        <FaRegEyeSlash />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Sichtbarkeit in der Seitenleiste</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={pageId} />

          <RadioGroup
            name="sidebarMode"
            value={selectedMode}
            onChange={setSelectedMode}
            items={[
              {
                value: WikiPageSidebarMode.VISIBLE,
                label: "Sichtbar",
                hint: "Die Seite und ihre Unterseiten erscheinen in der Seitenleiste.",
              },
              {
                value: WikiPageSidebarMode.HIDDEN,
                label: "Ausgeblendet",
                hint: "Die Seite und alle ihre Unterseiten erscheinen nicht in der Seitenleiste.",
              },
              {
                value: WikiPageSidebarMode.CHILDREN_HIDDEN,
                label: "Nur Unterseiten ausgeblendet",
                hint: "Die Seite bleibt in der Seitenleiste sichtbar, alle ihre Unterseiten erscheinen dort nicht — auch zukünftige. Praktisch für Datensätze mit vielen Unterseiten.",
              },
            ]}
          />

          <Note
            type="info"
            className="mt-4"
            message="Hat keinen Einfluss auf Berechtigungen: Ausgeblendete Seiten bleiben über Links, Suche, Favoriten, Tags und Seitenverzeichnisse erreichbar."
          />

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Speichern
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
