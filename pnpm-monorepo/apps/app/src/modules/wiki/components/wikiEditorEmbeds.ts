"use client";

import { normalizeWikiEmbedUrl } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { unstable_rethrow } from "next/navigation";
import toast from "react-hot-toast";
import { validateWikiIframeSrc } from "../actions/validateWikiIframeSrc";

/**
 * Inserts a YouTube/Twitch/Spotify/Google embed for the given URL at the
 * current selection (replacing a selected node). Shows a toast and returns
 * false when the URL is not supported.
 */
export const insertWikiEmbedFromUrl = (
  editor: Editor,
  url: string,
): boolean => {
  const trimmed = url.trim();

  if (/(?:youtube\.com|youtu\.be)\//.test(trimmed)) {
    const inserted = editor
      .chain()
      .focus()
      .setYoutubeVideo({ src: trimmed })
      .run();
    if (!inserted) toast.error("Diese YouTube-URL wird nicht unterstützt.");
    return inserted;
  }

  const normalized = normalizeWikiEmbedUrl(trimmed);
  if (!normalized) {
    toast.error(
      "Diese URL wird nicht unterstützt. Möglich sind YouTube, Twitch, Spotify und Google Docs/Tabellen/Präsentationen.",
    );
    return false;
  }

  return editor.chain().focus().setWikiEmbed(normalized).run();
};

/**
 * Validates a generic iframe URL against the domain allowlist (server
 * action) and inserts it at the current selection (replacing a selected
 * node). Shows a toast and returns false when rejected.
 */
export const insertWikiIframeFromUrl = async (
  editor: Editor,
  url: string,
): Promise<boolean> => {
  const src = url.trim();

  try {
    const formData = new FormData();
    formData.set("src", src);
    const response = await validateWikiIframeSrc(formData);
    if ("error" in response) {
      toast.error(response.error);
      return false;
    }
  } catch (error) {
    unstable_rethrow(error);
    toast.error(
      "Die URL konnte nicht geprüft werden. Bitte versuche es später erneut.",
    );
    console.error(error);
    return false;
  }

  return editor.chain().focus().setWikiIframe({ src }).run();
};
