"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import type { Editor } from "@tiptap/react";
import { useState, useTransition } from "react";
import { FaPlus } from "react-icons/fa";
import { insertWikiEmbedFromUrl } from "./wikiEditorEmbeds";

interface Props {
  readonly editor: Editor;
  readonly onRequestClose: () => void;
}

/**
 * URL dialog behind the palettes' "Einbetten" entry — same routing as the
 * toolbar's EmbedPicker: YouTube/Twitch/Spotify/Google get their dedicated
 * player, any other URL becomes a generic allowlist-validated iframe.
 */
export const WikiEmbedUrlModal = ({ editor, onRequestClose }: Props) => {
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const insert = () => {
    startTransition(async () => {
      if (!(await insertWikiEmbedFromUrl(editor, url))) return;
      onRequestClose();
    });
  };

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Einbetten</h2>}
    >
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          insert();
        }}
      >
        <TextInput
          aria-label="Einbetten"
          hint="YouTube, Twitch, Spotify, Google Docs/Tabellen/Präsentationen oder freigegebene Domains"
          placeholder="https://…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          autoFocus
          required
        />

        <Button2 type="submit" disabled={isPending} className="mt-3 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaPlus />}
          Einfügen
        </Button2>
      </form>
    </Modal>
  );
};
