"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { useState } from "react";
import { FaSave } from "react-icons/fa";
import { createWikiPage } from "../actions/createWikiPage";
import {
  wikiPageOptionLabel,
  type WikiPageTargetOption,
} from "../utils/getEditableWikiPageTargets";

interface Props {
  readonly targets: WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly defaultParentId?: string;
  readonly onSuccess?: () => void;
}

/**
 * Form for creating a new page with a parent select representing the page
 * hierarchy. On success the action redirects to the new page.
 */
export const CreateWikiPageForm = ({
  targets,
  allowTopLevel,
  defaultParentId,
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
   * A successful creation redirects to the new page; onSuccess closes the
   * modal so it isn't still open after the navigation.
   */
  const { state, formAction, isPending } = useAction(createWikiPage, {
    onSuccess,
  });

  if (!allowTopLevel && targets.length === 0)
    return (
      <Note
        type="info"
        message="Du hast derzeit keine Berechtigung, Seiten zu erstellen."
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
      <Select
        name="parentId"
        value={parentId}
        onChange={(event) => setParentId(event.target.value)}
        required={!allowTopLevel}
      >
        {allowTopLevel && <option value="">Oberste Ebene</option>}
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {wikiPageOptionLabel(target)}
          </option>
        ))}
      </Select>

      {parentId === "" && (
        <p className="mt-2 text-sm text-neutral-400">
          Neue Seiten auf oberster Ebene sind zunächst privat: Nur du kannst sie
          sehen und bearbeiten. Die Berechtigungen kannst du anschließend an der
          Seite anpassen.
        </p>
      )}

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Erstellen
      </Button2>

      {state && "error" in state && state.error && (
        <Note type="error" message={state.error} className="mt-4" />
      )}
    </form>
  );
};
