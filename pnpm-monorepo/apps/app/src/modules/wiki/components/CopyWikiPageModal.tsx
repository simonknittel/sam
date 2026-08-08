"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import Modal from "@/modules/common/components/Modal";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaCopy } from "react-icons/fa";
import { serializeWikiClipboardCookie } from "../utils/wikiClipboardCookie";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly title: string;
  /** Readable descendants — what "Unterseiten mitkopieren" would copy */
  readonly visibleDescendantCount: number;
}

/**
 * Puts the page into the clipboard cookie — the first half of copy'n'paste.
 * Available to everyone who can read the page: copying only reads, and
 * inserting takes manage access on the target. The insert is offered by the
 * create-page modal ("Neue Seite" or the sidebar plus), also in another
 * wiki — the copies take on the target's scope and permissions there.
 */
export const CopyWikiPageModal = ({
  className,
  pageId,
  title,
  visibleDescendantCount,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [includeChildren, setIncludeChildren] = useState(true);

  const copyToClipboard = () => {
    const withChildren = visibleDescendantCount > 0 && includeChildren;
    document.cookie = serializeWikiClipboardCookie({
      pageId,
      includeChildren: withChildren,
      title,
      childCount: withChildren ? visibleDescendantCount : 0,
    });
    setIsOpen(false);
    toast.success("Seite in die Zwischenablage kopiert");
  };

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        tooltip="Seite kopieren"
      >
        <FaCopy />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Seite kopieren</h2>}
      >
        <p>
          Die Seite kommt in die Zwischenablage. Einfügen kannst du sie über
          „Neue Seite“ oder das Plus in der Seitenleiste — auch in einem anderen
          Wiki, etwa dem Briefing eines Events.
        </p>

        {visibleDescendantCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-sm text-neutral-400">
              Unterseiten mitkopieren (nur Seiten, die für dich sichtbar sind)
            </span>
            <YesNoCheckbox
              checked={includeChildren}
              onChange={(event) => setIncludeChildren(event.target.checked)}
            />
          </div>
        )}

        <Button2
          type="button"
          onClick={copyToClipboard}
          className="mt-4 ml-auto"
        >
          <FaCopy />
          Kopieren
        </Button2>
      </Modal>
    </>
  );
};
