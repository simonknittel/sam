"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { useState } from "react";
import { FaPaste, FaTrashAlt } from "react-icons/fa";
import { pasteWikiPages } from "../actions/pasteWikiPages";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import type { WikiClipboardEntry } from "../utils/wikiClipboardCookie";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  readonly className?: string;
  readonly clipboard: WikiClipboardEntry;
  /** Visible pages the viewer manages */
  readonly targets: readonly WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly defaultParentId?: string;
  readonly onDiscard: () => void;
  readonly onSuccess?: () => void;
}

/**
 * The insert half of copy'n'paste, shown by the create-page modal while the
 * clipboard cookie holds a copied page. The clipboard's title and child
 * count are display-only — the insert re-resolves the source, so the error
 * here is where a meanwhile deleted or hidden source surfaces.
 */
export const PasteWikiPagesSection = ({
  className,
  clipboard,
  targets,
  allowTopLevel,
  defaultParentId,
  onDiscard,
  onSuccess,
}: Props) => {
  const [parentId, setParentId] = useState(() => {
    if (
      defaultParentId &&
      targets.some((target) => target.id === defaultParentId)
    )
      return defaultParentId;
    if (allowTopLevel || targets.length === 0) return "";
    return targets[0].id;
  });

  /**
   * A successful insert redirects to the pasted page; onSuccess closes the
   * modal so it isn't still open after the navigation.
   */
  const { state, formAction, isPending } = useAction(pasteWikiPages, {
    errorToast: false,
    onSuccess,
  });

  return (
    <section
      className={clsx(
        "rounded-primary border-t-2 border-blue-500 bg-blue-500/10 px-4 py-3",
        className,
      )}
    >
      <h3 className="flex items-center gap-2 font-bold">
        <FaPaste className="text-blue-500" />
        Kopierte Seite einfügen
      </h3>

      <p className="mt-2">
        „{clipboard.title}“
        {clipboard.childCount > 0 && ` + ${clipboard.childCount} Unterseiten`}
      </p>

      <form action={formAction}>
        <input type="hidden" name="sourcePageId" value={clipboard.pageId} />
        {clipboard.includeChildren && (
          <input type="hidden" name="includeChildren" value="1" />
        )}

        <label className="mt-4 mb-1 block">Einfügen unter</label>
        <WikiPageSelect
          name="parentId"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          required={!allowTopLevel}
          targets={targets}
          emptyOptionLabel={allowTopLevel ? "Oberste Ebene" : undefined}
        />

        <p className="mt-2 text-sm text-neutral-400">
          Die eingefügten Seiten übernehmen die Berechtigungen des neuen Orts.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={onDiscard}
            title="Zwischenablage leeren"
          >
            <FaTrashAlt />
            Verwerfen
          </Button2>

          <Button2 type="submit" disabled={isPending}>
            {isPending ? <AsciiSpinner /> : <FaPaste />}
            Einfügen
          </Button2>
        </div>

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </section>
  );
};
