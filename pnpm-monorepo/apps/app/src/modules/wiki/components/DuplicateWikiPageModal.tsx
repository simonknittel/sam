"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { TextInput } from "@/modules/common/components/form/TextInput";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { useState } from "react";
import { FaClone, FaSave } from "react-icons/fa";
import { duplicateWikiPage } from "../actions/duplicateWikiPage";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { WikiPageSelect } from "./WikiPageSelect";

const TITLE_MAX_LENGTH = 128;
const TITLE_SUFFIX = " (Duplikat)";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly title: string;
  /** Visible pages the viewer manages */
  readonly targets: readonly WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  readonly currentParentId: string | null;
  readonly hasDescendants: boolean;
}

/**
 * Duplicates a page to a chosen location, optionally including its visible
 * subtree. On success the action redirects to the new page. Copies never
 * carry the source's permissions over — the warning says so, because that
 * can make the copy visible to more people than the original.
 */
export const DuplicateWikiPageModal = ({
  className,
  pageId,
  title,
  targets,
  allowTopLevel,
  currentParentId,
  hasDescendants,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const [parentId, setParentId] = useState(() => {
    if (
      currentParentId &&
      targets.some((target) => target.id === currentParentId)
    )
      return currentParentId;
    if (allowTopLevel || targets.length === 0) return "";
    return targets[0].id;
  });
  const [mirrorChildren, setMirrorChildren] = useState(true);

  const { state, formAction, isPending } = useAction(duplicateWikiPage, {
    errorToast: false,
    onSuccess: () => setIsOpen(false),
  });

  const defaultTitle =
    title.slice(0, TITLE_MAX_LENGTH - TITLE_SUFFIX.length) + TITLE_SUFFIX;

  /** Duplicating needs somewhere to put the copy */
  const canDuplicate = allowTopLevel || targets.length > 0;

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        className={className}
        disabled={!canDuplicate}
        tooltip={
          canDuplicate
            ? "Seite duplizieren"
            : "Duplikate kannst du nur in Seiten ablegen, die du verwaltest"
        }
      >
        <FaClone />
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Seite duplizieren</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={pageId} />

          <TextInput
            name="title"
            label="Titel"
            defaultValue={defaultTitle}
            maxLength={TITLE_MAX_LENGTH}
            required
            autoFocus
          />

          <label className="mt-4 mb-1 block">Ort</label>
          <WikiPageSelect
            name="parentId"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            required={!allowTopLevel}
            targets={targets}
            emptyOptionLabel={allowTopLevel ? "Oberste Ebene" : undefined}
          />

          {hasDescendants && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm text-neutral-400">
                Unterseiten mitduplizieren (nur Seiten, die für dich sichtbar
                sind)
              </span>
              <YesNoCheckbox
                name="mirrorChildren"
                value="1"
                checked={mirrorChildren}
                onChange={(event) => setMirrorChildren(event.target.checked)}
              />
            </div>
          )}

          <Note
            type="warning"
            className="mt-4"
            message="Die Kopie und alle mitkopierten Unterseiten übernehmen die Berechtigungen des neuen Orts — eigene Berechtigungen des Originals werden nicht übernommen. Dadurch kann die Kopie für mehr Personen sichtbar sein als das Original."
          />

          {parentId === "" && (
            <p className="mt-2 text-sm text-neutral-400">
              Neue Seiten auf oberster Ebene sind zunächst privat: Nur du kannst
              sie sehen und bearbeiten. Die Berechtigungen kannst du
              anschließend an der Seite anpassen.
            </p>
          )}

          <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
            {isPending ? <AsciiSpinner /> : <FaSave />}
            Duplizieren
          </Button2>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
