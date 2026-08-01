"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { insertWikiEmbedFromUrl } from "../wikiEditorEmbeds";

interface Props {
  readonly editor: Editor | null;
}

/**
 * URL input for the dedicated embeds: YouTube, Twitch, Spotify and Google
 * Docs/Sheets/Slides/Drive. Pasting such a URL directly into the editor
 * embeds it as well.
 */
export const EmbedPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();
  const [url, setUrl] = useState("");

  const insert = () => {
    if (!editor) return;
    if (!insertWikiEmbedFromUrl(editor, url)) return;
    setUrl("");
    closePopover();
  };

  return (
    <form
      className="flex w-72 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        insert();
      }}
    >
      <TextInput
        aria-label="Einbetten"
        hint="YouTube, Twitch, Spotify oder Google Docs/Tabellen/Präsentationen"
        placeholder="https://…"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        required
      />

      <Button2 type="submit" className="mt-3 ml-auto">
        <FaPlus />
        Einfügen
      </Button2>
    </form>
  );
};
