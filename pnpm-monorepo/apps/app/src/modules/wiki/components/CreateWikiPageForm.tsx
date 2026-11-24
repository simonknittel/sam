"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { TextInput } from "@/modules/common/components/form/TextInput";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import type { EventContainer } from "@/modules/events/utils/eventContainer";
import { api } from "@/trpc/react";
import { WIKI_PAGE_TITLE_MAXIMUM_LENGTH } from "@sam-monorepo/domain";
import { useId, useState } from "react";
import { FaSave } from "react-icons/fa";
import { createWikiPage } from "../actions/createWikiPage";
import { chooseWikiParentId } from "../utils/chooseWikiParentId";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import { WikiPageSelect } from "./WikiPageSelect";
import { useReloadWikiPageTargetsAfterError } from "./WikiPageTargetsLoader";

interface Props {
  readonly targets: WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly defaultParentId?: string;
  /** Set inside a briefing — scopes the "copy from" options */
  readonly container?: EventContainer;
  readonly onSuccess?: () => void;
}

export const CreateWikiPageForm = ({
  targets,
  allowTopLevel,
  defaultParentId,
  container,
  onSuccess,
}: Props) => {
  const { variantId } = useWikiPageHrefMode();
  const [chosenParentId, setParentId] = useState(() =>
    chooseWikiParentId(targets, allowTopLevel, defaultParentId),
  );
  /** The pages load again after an error and can then miss the chosen page */
  const parentId = chooseWikiParentId(targets, allowTopLevel, chosenParentId);
  const [copyFromPageId, setCopyFromPageId] = useState("");
  const parentSelectId = useId();
  const copySourceSelectId = useId();
  const [copyChildren, setCopyChildren] = useState(true);

  /** Fetched lazily: the form only mounts while the modal is open */
  const { data: copySourceTargets } = api.wiki.getPageTargets.useQuery({
    permission: "read",
    container,
  });

  /**
   * A successful creation redirects: without `onSuccess` the modal would still
   * be open after the navigation.
   */
  const { state, formAction } = useAction(
    useReloadWikiPageTargetsAfterError(createWikiPage),
    { errorToast: false, onSuccess },
  );

  if (!allowTopLevel && targets.length === 0)
    return (
      <Note
        type="info"
        message="Neue Seiten kannst du nur in Seiten anlegen, die du verwaltest. Derzeit verwaltest du keine Seite."
      />
    );

  return (
    <form action={formAction}>
      {variantId && <input type="hidden" name="variantId" value={variantId} />}

      <TextInput
        name="title"
        label="Titel"
        maxLength={WIKI_PAGE_TITLE_MAXIMUM_LENGTH}
        required
        autoFocus
      />

      <label className="mt-4 mb-1 block" htmlFor={parentSelectId}>
        Übergeordnete Seite
      </label>
      <WikiPageSelect
        id={parentSelectId}
        name="parentId"
        value={parentId}
        onChange={(event) => setParentId(event.target.value)}
        required={!allowTopLevel}
        targets={targets}
        emptyOptionLabel={allowTopLevel ? "Oberste Ebene" : undefined}
      />

      {parentId === "" && (
        <p className="mt-2 text-sm text-neutral-400">
          Neue Seiten auf oberster Ebene sind zunächst privat: Nur du kannst sie
          sehen und bearbeiten. Die Berechtigungen kannst du anschließend an der
          Seite anpassen.
        </p>
      )}

      <label className="mt-4 mb-1 block" htmlFor={copySourceSelectId}>
        Inhalt kopieren von (optional)
      </label>
      <WikiPageSelect
        id={copySourceSelectId}
        name="copyFromPageId"
        value={copyFromPageId}
        onChange={(event) => setCopyFromPageId(event.target.value)}
        targets={copySourceTargets ?? []}
        emptyOptionLabel="Leere Seite"
        disabled={!copySourceTargets}
      />

      {copyFromPageId !== "" && (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-sm text-neutral-400">
              Unterseiten mitkopieren
            </span>
            <YesNoCheckbox
              name="copyChildren"
              value="1"
              checked={copyChildren}
              onChange={(event) => setCopyChildren(event.target.checked)}
            />
          </div>

          <Note
            type="warning"
            className="mt-4"
            message="Die Kopie und alle mitkopierten Unterseiten übernehmen die Berechtigungen des neuen Orts — eigene Berechtigungen des Originals werden nicht übernommen. Dadurch kann die Kopie für mehr Personen sichtbar sein als das Original."
          />
        </>
      )}

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Erstellen
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
