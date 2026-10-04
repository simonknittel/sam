"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { SLUG_MAX_LENGTH } from "@/modules/common/utils/slugify";
import { useState } from "react";
import { FaSave } from "react-icons/fa";
import { renameFlow } from "../actions/renameFlow";
import { FLOW_NAME_MAX_LENGTH } from "../utils/flowSlug";

interface Props {
  readonly flowId: string;
  readonly name: string;
  readonly slug: string;
}

export const RenameFlowForm = ({ flowId, name, slug }: Props) => {
  const [currentName, setCurrentName] = useState(name);
  const [currentSlug, setCurrentSlug] = useState(slug);

  const { state, formAction } = useAction(renameFlow, {
    errorToast: false,
  });

  /**
   * The slug is the flow's URL, so changing it breaks every link pointing at
   * the old one — worth saying before the save, not after.
   */
  const isSlugChanged = currentSlug !== slug;

  return (
    <form action={formAction}>
      <input type="hidden" name="flowId" value={flowId} />

      <TextInput
        name="name"
        label="Name"
        value={currentName}
        onChange={(event) => setCurrentName(event.target.value)}
        maxLength={FLOW_NAME_MAX_LENGTH}
        required
      />

      <TextInput
        name="slug"
        label="Slug"
        className="mt-4"
        hint={`Teil der URL: /app/career/${currentSlug || "…"}`}
        value={currentSlug}
        onChange={(event) => setCurrentSlug(event.target.value)}
        maxLength={SLUG_MAX_LENGTH}
        required
      />

      {isSlugChanged && (
        <Note
          type="warning"
          message={`Der Karrierebaum ist danach unter /app/career/${currentSlug} erreichbar. Bestehende Links auf /app/career/${slug} funktionieren nicht mehr.`}
          className="mt-4"
        />
      )}

      <ActionErrorNote className="mt-4" state={state} />

      <div className="mt-4 flex justify-end">
        <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
      </div>
    </form>
  );
};
