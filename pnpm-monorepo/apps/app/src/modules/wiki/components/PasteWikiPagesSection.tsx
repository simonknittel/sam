"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { WikiPasteMode } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState } from "react";
import { FaPaste, FaTrashAlt } from "react-icons/fa";
import { pasteWikiPages } from "../actions/pasteWikiPages";
import { chooseWikiParentId } from "../utils/chooseWikiParentId";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import type { WikiClipboardEntry } from "../utils/wikiClipboardCookie";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import { WikiPageSelect } from "./WikiPageSelect";
import { useReloadWikiPageTargetsAfterError } from "./WikiPageTargetsLoader";

interface Props {
  readonly className?: string;
  readonly clipboard: WikiClipboardEntry;
  readonly targets: readonly WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly defaultParentId?: string;
  readonly onDiscard: () => void;
  readonly onSuccess?: () => void;
}

/**
 * The replace mode is how a whole briefing lands on another event's locked
 * root. The clipboard's title and child count are display-only: the insert
 * re-resolves the source, so the error here is where a meanwhile deleted or
 * hidden source surfaces.
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
  const { variantId } = useWikiPageHrefMode();
  const [mode, setMode] = useState(WikiPasteMode.Child);
  const [chosenParentId, setParentId] = useState(() =>
    chooseWikiParentId(targets, allowTopLevel, defaultParentId),
  );
  /**
   * The pages load again after an error and can then miss the chosen page.
   * Replace mode needs a page: "Oberste Ebene" only exists for children.
   */
  const parentId = chooseWikiParentId(
    targets,
    mode === WikiPasteMode.Child && allowTopLevel,
    chosenParentId,
  );

  const { state, formAction } = useAction(
    useReloadWikiPageTargetsAfterError(pasteWikiPages),
    { errorToast: false, onSuccess },
  );

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
        {variantId && (
          <input type="hidden" name="variantId" value={variantId} />
        )}

        <RadioGroup
          label="Art des Einfügens"
          className="mt-4"
          name="mode"
          value={mode}
          onChange={(value) => setMode(value as WikiPasteMode)}
          equalWidth
          items={[
            { value: WikiPasteMode.Child, label: "Als Unterseite" },
            { value: WikiPasteMode.Replace, label: "Seite ersetzen" },
          ]}
        />

        <label className="mt-4 mb-1 block">
          {mode === WikiPasteMode.Replace
            ? "Zu ersetzende Seite"
            : "Einfügen unter"}
        </label>
        <WikiPageSelect
          name="parentId"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          required={mode === WikiPasteMode.Replace || !allowTopLevel}
          targets={targets}
          emptyOptionLabel={
            mode === WikiPasteMode.Child && allowTopLevel
              ? "Oberste Ebene"
              : undefined
          }
        />

        <p className="mt-2 text-sm text-neutral-400">
          {mode === WikiPasteMode.Replace
            ? "Icon, Tags und Seitenleisten-Einstellung werden übernommen; Titel, Berechtigungen, Unterseiten bleiben erhalten, kopierte werden daneben eingefügt."
            : "Die eingefügten Seiten übernehmen die Berechtigungen des neuen Orts."}
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

          <SubmitButton icon={<FaPaste />}>Einfügen</SubmitButton>
        </div>

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </section>
  );
};
