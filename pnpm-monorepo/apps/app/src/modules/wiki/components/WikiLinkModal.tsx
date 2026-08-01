"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { api } from "@/modules/common/utils/api";
import { getWikiSelectionRestrictions } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa";
import { WikiPageSelect } from "./WikiPageSelect";

/**
 * A pasted wiki page URL counts as picking that page (mirrors the paste
 * rule in wikiPageLinkNode.ts); the host part is optional so a copied
 * pathname works too.
 */
const WIKI_PAGE_URL_PATTERN =
  /^(?:https?:\/\/\S+)?\/app\/wiki\/([a-z0-9]{10,40})(?:\/\S*)?$/;

const EXTERNAL_URL_PATTERN = /^(https?:\/\/|www\.)/i;

interface Props {
  readonly editor: Editor;
  readonly onRequestClose: () => void;
}

/**
 * Link dialog behind the selection menu's link button and the palettes'
 * "Link" entry: picking a wiki page replaces the selection with the
 * auto-updating page link node, a URL turns the selection into an
 * external link — with no selection, an editable text field provides the
 * link text.
 */
export const WikiLinkModal = ({ editor, onRequestClose }: Props) => {
  /**
   * The blurred editor keeps its selection while the dialog is open (the
   * inserts below run on it), so these can be read once at mount. Only
   * position values must not be captured — remote collab edits shift them,
   * and only the live selection is mapped through those.
   */
  const [{ empty, hadLink, pageLinksAllowed }] = useState(() => ({
    empty: editor.state.selection.empty,
    hadLink: editor.isActive("link"),
    /** Inline nodes are schema-invalid in headings — URL links only */
    pageLinksAllowed: !getWikiSelectionRestrictions(editor.state).inlineNodes,
  }));

  const [pageId, setPageId] = useState("");
  const [url, setUrl] = useState(() =>
    String(editor.getAttributes("link").href ?? ""),
  );
  /** NULL until edited — the field mirrors the URL input until then */
  const [linkText, setLinkText] = useState<string | null>(null);

  /**
   * Readable pages in tree order — permission-filtered server-side, so
   * invisible titles can never leak.
   */
  const { data: pageTargets } = api.wiki.getPageTargets.useQuery(
    { permission: "read" },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: pageLinksAllowed,
    },
  );

  const trimmed = url.trim();
  /** A typed/pasted wiki page URL counts as picking that page */
  const urlPageId = pageLinksAllowed
    ? (WIKI_PAGE_URL_PATTERN.exec(trimmed)?.[1] ?? null)
    : null;
  const selectedPageId =
    pageId ||
    (urlPageId && pageTargets?.some((target) => target.id === urlPageId)
      ? urlPageId
      : "");
  const isExternalUrl = !selectedPageId && EXTERNAL_URL_PATTERN.test(trimmed);

  const insertPageLink = (targetPageId: string) => {
    editor
      .chain()
      .focus()
      .insertContent(
        /** The trailing space parks the caret outside the atom node */
        empty
          ? [
              { type: "wikiPageLink", attrs: { pageId: targetPageId } },
              { type: "text", text: " " },
            ]
          : [{ type: "wikiPageLink", attrs: { pageId: targetPageId } }],
      )
      .run();
    onRequestClose();
  };

  const insertExternalLink = () => {
    const href = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
    try {
      const parsed = new URL(href);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
        throw new Error("Unsupported protocol");
    } catch {
      toast.error("Bitte eine gültige URL angeben (https://…).");
      return;
    }

    if (empty) {
      const text = (linkText ?? href).trim() || href;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text,
          marks: [{ type: "link", attrs: { href } }],
        })
        /** Typing right after the insert must not extend the link */
        .unsetMark("link")
        .run();
    } else {
      const chain = editor.chain().focus();
      if (hadLink) chain.extendMarkRange("link");
      chain.setLink({ href }).run();
    }
    onRequestClose();
  };

  const submit = () => {
    if (selectedPageId) {
      insertPageLink(selectedPageId);
      return;
    }
    if (isExternalUrl) insertExternalLink();
  };

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Link</h2>}
    >
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {pageLinksAllowed && (
          <>
            <label className="mb-1 block">Wiki-Seite</label>
            <WikiPageSelect
              name="pageId"
              value={pageId}
              onChange={(event) => {
                setPageId(event.target.value);
                if (event.target.value) setUrl("");
              }}
              targets={pageTargets ?? []}
              emptyOptionLabel="Keine Seite ausgewählt"
            />

            <label className="mt-4 mb-1 block">Oder externe URL</label>
          </>
        )}
        <TextInput
          aria-label={pageLinksAllowed ? "Externe URL" : "Link"}
          hint={
            pageLinksAllowed
              ? "Eingefügte Wiki-Seiten-URLs werden zu Seitenlinks"
              : "In Überschriften sind nur externe URLs möglich, keine Seitenlinks"
          }
          placeholder="https://…"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            if (event.target.value) setPageId("");
          }}
          autoFocus={!pageLinksAllowed || hadLink}
        />

        {isExternalUrl && empty && (
          <TextInput
            label="Text"
            className="mt-4"
            hint="Wird als verlinkter Text eingefügt"
            value={linkText ?? trimmed}
            onChange={(event) => setLinkText(event.target.value)}
          />
        )}

        <Button2
          type="submit"
          disabled={!selectedPageId && !isExternalUrl}
          className="mt-4 ml-auto"
        >
          <FaPlus />
          Einfügen
        </Button2>
      </form>
    </Modal>
  );
};
