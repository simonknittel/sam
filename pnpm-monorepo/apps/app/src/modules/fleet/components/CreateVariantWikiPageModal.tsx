"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { WikiPageSelect } from "@/modules/wiki/components/WikiPageSelect";
import { chooseWikiParentId } from "@/modules/wiki/utils/chooseWikiParentId";
import type { WikiPageTargetOption } from "@/modules/wiki/utils/getWikiPageTargets";
import { api } from "@/trpc/react";
import type { Variant } from "@sam-monorepo/database/browser";
import { WIKI_PAGE_TITLE_MAXIMUM_LENGTH } from "@sam-monorepo/domain";
import { useId, useState } from "react";
import { FaSave } from "react-icons/fa";
import { createVariantWikiPage } from "../actions/createVariantWikiPage";

interface Props {
  readonly variant: Pick<Variant, "id" | "name">;
  /** Whether the user can create a page at the top of the global wiki */
  readonly allowTopLevel: boolean;
  readonly onRequestClose: () => void;
}

/**
 * Creates an empty page in the global wiki and links it to the variant. The
 * parents are the pages that the user manages.
 */
export const CreateVariantWikiPageModal = ({
  variant,
  allowTopLevel,
  onRequestClose,
}: Props) => {
  /** Not cached: the parents must include the pages that were created since */
  const targets = api.wiki.getPageTargets.useQuery(
    { permission: "manage" },
    { gcTime: 0 },
  );

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Neue Wiki-Seite</h2>}
    >
      {targets.data ? (
        <CreateVariantWikiPageForm
          variant={variant}
          targets={targets.data}
          allowTopLevel={allowTopLevel}
          onSuccess={onRequestClose}
        />
      ) : targets.isError ? (
        <Note
          type="error"
          message="Die Seiten konnten nicht geladen werden. Bitte versuche es erneut."
        />
      ) : (
        <div className="h-40 animate-pulse rounded-secondary bg-neutral-900" />
      )}
    </Modal>
  );
};

interface FormProps {
  readonly variant: Pick<Variant, "id" | "name">;
  readonly targets: WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly onSuccess: () => void;
}

const CreateVariantWikiPageForm = ({
  variant,
  targets,
  allowTopLevel,
  onSuccess,
}: FormProps) => {
  const parentSelectId = useId();
  const [parentId, setParentId] = useState(() =>
    chooseWikiParentId(targets, allowTopLevel),
  );
  const { formAction } = useAction(createVariantWikiPage, { onSuccess });

  if (!allowTopLevel && targets.length === 0)
    return (
      <Note
        type="info"
        message="Neue Seiten kannst du nur in Seiten anlegen, die du verwaltest. Derzeit verwaltest du keine Seite."
      />
    );

  return (
    <form action={formAction}>
      <input type="hidden" name="variantId" value={variant.id} />

      <TextInput
        name="title"
        label="Titel"
        maxLength={WIKI_PAGE_TITLE_MAXIMUM_LENGTH}
        defaultValue={variant.name}
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

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Erstellen
      </SubmitButton>
    </form>
  );
};
