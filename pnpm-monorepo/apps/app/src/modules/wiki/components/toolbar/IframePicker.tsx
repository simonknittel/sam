"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Editor } from "@tiptap/react";
import { useState, useTransition } from "react";
import { FaPlus } from "react-icons/fa";
import { insertWikiIframeFromUrl } from "../wikiEditorEmbeds";

interface Props {
  readonly editor: Editor | null;
}

/**
 * URL input for generic iframes. The URL is checked against the domain
 * allowlist through a server action before inserting; rendering
 * re-validates, so allowlist changes take effect on existing embeds too.
 */
export const IframePicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const insert = () => {
    startTransition(async () => {
      if (!editor) return;
      if (!(await insertWikiIframeFromUrl(editor, url))) return;
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
        aria-label="Website einbetten"
        hint="Nur Domains, die in den Wiki-Einstellungen freigegeben sind"
        placeholder="https://…"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        required
      />

      <Button2 type="submit" disabled={isPending} className="mt-3 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaPlus />}
        Einfügen
      </Button2>
    </form>
  );
};
