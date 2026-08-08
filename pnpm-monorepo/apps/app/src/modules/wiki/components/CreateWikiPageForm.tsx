"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { TextInput } from "@/modules/common/components/form/TextInput";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { api } from "@/modules/common/utils/api";
import { useState } from "react";
import { FaSave } from "react-icons/fa";
import { createWikiPage } from "../actions/createWikiPage";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { WikiPageSelect } from "./WikiPageSelect";

interface Props {
  /** Visible pages the viewer manages */
  readonly targets: WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly defaultParentId?: string;
  /** Set inside an event wiki — scopes the "copy from" options */
  readonly eventId?: string;
  readonly onSuccess?: () => void;
}

/**
 * Form for creating a new page with a parent select representing the page
 * hierarchy, optionally starting as a copy of a readable page. On success
 * the action redirects to the new page.
 */
export const CreateWikiPageForm = ({
  targets,
  allowTopLevel,
  defaultParentId,
  eventId,
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
  const [copyFromPageId, setCopyFromPageId] = useState("");
  const [copyChildren, setCopyChildren] = useState(true);

  /**
   * Options of the "copy from" select. Fetched lazily: the form only mounts
   * while the modal is open.
   */
  const { data: copySourceTargets } = api.wiki.getPageTargets.useQuery(
    { permission: "read", eventId },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  /**
   * A successful creation redirects to the new page; onSuccess closes the
   * modal so it isn't still open after the navigation.
   */
  const { state, formAction, isPending } = useAction(createWikiPage, {
    errorToast: false,
    onSuccess,
  });

  if (!allowTopLevel && targets.length === 0)
    return (
      <Note
        type="info"
        message="Neue Seiten kannst du nur in Seiten anlegen, die du verwaltest. Derzeit verwaltest du keine Seite."
      />
    );

  return (
    <form action={formAction}>
      <TextInput
        name="title"
        label="Titel"
        maxLength={128}
        required
        autoFocus
      />

      <label className="mt-4 mb-1 block">Übergeordnete Seite</label>
      <WikiPageSelect
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

      <label className="mt-4 mb-1 block">Inhalt kopieren von (optional)</label>
      <WikiPageSelect
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

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Erstellen
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
