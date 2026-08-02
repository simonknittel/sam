"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Editor } from "@tiptap/react";
import { useState, useTransition } from "react";
import { FaPlus } from "react-icons/fa";
import { insertWikiEmbedFromUrl } from "../wikiEditorEmbeds";

interface Props {
  readonly editor: Editor | null;
}

/**
 * URL input for embeds. YouTube, Twitch, Spotify and Google
 * Docs/Sheets/Slides/Drive URLs get their dedicated player; any other URL
 * becomes a generic iframe, validated against the domain allowlist through
 * a server action.
 */
export const EmbedPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const insert = () => {
    startTransition(async () => {
      if (!editor) return;
      if (!(await insertWikiEmbedFromUrl(editor, url))) return;
      setUrl("");
      closePopover();
    });
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
        hint="YouTube, Twitch, Spotify, Google Docs/Tabellen/Präsentationen oder freigegebene Domains"
        placeholder="https://…"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        required
        autoFocus
      />

      <Button2 type="submit" disabled={isPending} className="mt-3 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaPlus />}
        Einfügen
      </Button2>
    </form>
  );
};
