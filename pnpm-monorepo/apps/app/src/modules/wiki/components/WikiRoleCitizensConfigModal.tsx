"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { normalizeWikiRoleCitizensConfig } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaSave } from "react-icons/fa";
import { WikiRoleSelector } from "./WikiRoleSelector";

interface Props {
  readonly editor: Editor;
  /** Document position of the node being configured */
  readonly position: number;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly onRequestClose: () => void;
}

/**
 * Configuration dialog for a role-members node ("Rollenmitglieder"), opened
 * from the edit menu: picks the role whose members the block lists. Saving
 * writes the node's attribute — the rendered list follows via the node
 * view's server fetch. Removing the role again is allowed; the block then
 * falls back to its unconfigured state.
 */
export const WikiRoleCitizensConfigModal = ({
  editor,
  position,
  attrs,
  onRequestClose,
}: Props) => {
  const initial = normalizeWikiRoleCitizensConfig(attrs);

  const save = (formData: FormData) => {
    /**
     * Guard against stale positions after collab edits — the node must
     * still be a role member list.
     */
    const node = editor.state.doc.nodeAt(position);
    if (node?.type.name === "wikiRoleCitizens") {
      const config = normalizeWikiRoleCitizensConfig({
        roleId: formData.get("roleId"),
      });
      editor
        .chain()
        .command(({ tr }) => {
          tr.setNodeAttribute(position, "roleId", config.roleId);
          return true;
        })
        .run();
    }
    onRequestClose();
  };

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Rollenmitglieder konfigurieren</h2>}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(new FormData(event.currentTarget));
        }}
      >
        <p className="mb-1">Rolle</p>
        <WikiRoleSelector
          inputName="roleId"
          defaultValue={initial.roleId ? [initial.roleId] : []}
          single
        />

        <Button2 type="submit" className="mt-4 ml-auto">
          <FaSave />
          Übernehmen
        </Button2>
      </form>
    </Modal>
  );
};
